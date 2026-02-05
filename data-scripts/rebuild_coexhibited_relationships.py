"""
Rebuild CO_EXHIBITED and CO_EXHIBITED_TOTAL relationships between artists.

This script processes exhibitions batch by batch to create relationships between
artists who exhibited together, avoiding memory issues with large-scale processing.
"""

import os
from neo4j import GraphDatabase
from typing import List, Dict, Set, Tuple
from collections import defaultdict
import logging
from datetime import datetime

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler(f'coexhibited_rebuild_{datetime.now().strftime("%Y%m%d_%H%M%S")}.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)


class CoExhibitedRelationshipBuilder:
    def __init__(self, uri: str, user: str, password: str):
        """Initialize connection to Neo4j database."""
        self.driver = GraphDatabase.driver(uri, auth=(user, password))
        logger.info(f"Connected to Neo4j at {uri}")
    
    def close(self):
        """Close the database connection."""
        self.driver.close()
        logger.info("Database connection closed")
    
    def clear_existing_relationships(self):
        """Remove all existing CO_EXHIBITED and CO_EXHIBITED_TOTAL relationships."""
        with self.driver.session() as session:
            logger.info("Clearing existing CO_EXHIBITED relationships...")
            result = session.run("""
                MATCH ()-[r:CO_EXHIBITED]->()
                DELETE r
                RETURN count(r) as deleted_count
            """)
            count = result.single(strict=True)["deleted_count"]
            logger.info(f"Deleted {count} CO_EXHIBITED relationships")
            
            logger.info("Clearing existing CO_EXHIBITED_TOTAL relationships...")
            result = session.run("""
                MATCH ()-[r:CO_EXHIBITED_TOTAL]->()
                DELETE r
                RETURN count(r) as deleted_count
            """)
            count = result.single(strict=True)["deleted_count"]
            logger.info(f"Deleted {count} CO_EXHIBITED_TOTAL relationships")
    
    def get_exhibition_count(self) -> int:
        """Get total number of exhibitions."""
        with self.driver.session() as session:
            result = session.run("MATCH (e:Exhibition) RETURN count(e) as count")
            return result.single(strict=True)["count"]
    
    def get_exhibitions_batch(self, skip: int, limit: int) -> List[Dict]:
        """
        Fetch a batch of exhibitions with their participating artists.
        
        Returns list of exhibitions with their IDs, year, and participating artist IDs.
        """
        with self.driver.session() as session:
            result = session.run("""
                MATCH (e:Exhibition)
                WITH e
                ORDER BY e.id
                SKIP $skip
                LIMIT $limit
                
                // Artists directly connect to exhibitions via EXHIBITED_AT
                OPTIONAL MATCH (artist:Artist)-[:EXHIBITED_AT]->(e)
                WHERE artist.id IS NOT NULL
                
                WITH e, collect(DISTINCT artist.id) as artist_ids
                WHERE size(artist_ids) > 1 AND e.id IS NOT NULL
                
                RETURN e.id as exhibition_id, 
                       e.title as exhibition_title,
                       e.startyear as exhibition_year,
                       artist_ids
            """, skip=skip, limit=limit)
            
            return [dict(record) for record in result]
    
    def create_coexhibited_relationships_batch(self, exhibition_data: List[Dict]) -> int:
        """
        Create CO_EXHIBITED relationships for a batch of exhibitions using bulk operations.
        
        Returns the number of relationships created.
        """
        # Group by artist pairs and year to create one relationship per year
        # Key: (artist1_id, artist2_id, year)
        # Value: list of exhibition IDs
        pair_year_map = defaultdict(list)
        
        for exhibition in exhibition_data:
            exhibition_id = exhibition["exhibition_id"]
            exhibition_year = exhibition.get("exhibition_year")
            artist_ids = exhibition["artist_ids"]
            
            # Filter out None/null values and ensure we have valid data
            if exhibition_id is None:
                continue
                
            artist_ids = [aid for aid in artist_ids if aid is not None]
            
            if len(artist_ids) < 2:
                continue
            
            # Skip if no year available
            if exhibition_year is None:
                continue
            
            # Create pairs of artists grouped by year
            for i in range(len(artist_ids)):
                for j in range(i + 1, len(artist_ids)):
                    key = (artist_ids[i], artist_ids[j], exhibition_year)
                    pair_year_map[key].append(exhibition_id)
        
        # Convert to list format for Cypher
        all_pairs = [
            {
                "artist1_id": artist1_id,
                "artist2_id": artist2_id,
                "year": year,
                "exhibitions": exhibition_ids
            }
            for (artist1_id, artist2_id, year), exhibition_ids in pair_year_map.items()
        ]
        
        if not all_pairs:
            return 0
        
        # Create all relationships in one bulk operation using UNWIND
        # One relationship per artist pair per year
        with self.driver.session() as session:
            result = session.run("""
                UNWIND $pairs as pair
                MATCH (a1:Artist {id: pair.artist1_id})
                MATCH (a2:Artist {id: pair.artist2_id})
                
                MERGE (a1)-[r1:CO_EXHIBITED {year: pair.year}]->(a2)
                ON CREATE SET r1.exhibitions = pair.exhibitions
                ON MATCH SET r1.exhibitions = pair.exhibitions
                
                MERGE (a2)-[r2:CO_EXHIBITED {year: pair.year}]->(a1)
                ON CREATE SET r2.exhibitions = pair.exhibitions
                ON MATCH SET r2.exhibitions = pair.exhibitions
                
                RETURN count(r1) + count(r2) as rel_count
            """, pairs=all_pairs)
            
            relationship_count = result.single(strict=True)["rel_count"]
        
        return relationship_count
    
    def create_coexhibited_total_relationships(self):
        """
        Aggregate CO_EXHIBITED relationships into CO_EXHIBITED_TOTAL with counts.
        """
        logger.info("Creating CO_EXHIBITED_TOTAL relationships...")
        
        with self.driver.session() as session:
            result = session.run("""
                MATCH (a1:Artist)-[r:CO_EXHIBITED]->(a2:Artist)
                WITH a1, a2, size(r.exhibitions) as count
                
                MERGE (a1)-[rt:CO_EXHIBITED_TOTAL]->(a2)
                SET rt.count = count,
                    rt.updated_at = datetime()
                
                RETURN count(rt) as total_relationships
            """)
            
            count = result.single(strict=True)["total_relationships"]
            logger.info(f"Created {count} CO_EXHIBITED_TOTAL relationships")
            
            return count
    
    def rebuild_relationships(self, batch_size: int = 50, clear_existing: bool = True):
        """
        Main method to rebuild all CO_EXHIBITED relationships.
        
        Args:
            batch_size: Number of exhibitions to process at once
            clear_existing: Whether to clear existing relationships first
        """
        logger.info("Starting CO_EXHIBITED relationship rebuild...")
        logger.info(f"Batch size: {batch_size}")
        
        # Clear existing relationships if requested
        if clear_existing:
            self.clear_existing_relationships()
        
        # Get total exhibition count
        total_exhibitions = self.get_exhibition_count()
        logger.info(f"Total exhibitions to process: {total_exhibitions}")
        
        # Process exhibitions in batches
        total_relationships = 0
        processed_exhibitions = 0
        skip = 0
        
        while skip < total_exhibitions:
            logger.info(f"Processing exhibitions {skip + 1} to {min(skip + batch_size, total_exhibitions)}...")
            
            exhibition_batch = self.get_exhibitions_batch(skip, batch_size)
            
            if not exhibition_batch:
                break
            
            rel_count = self.create_coexhibited_relationships_batch(exhibition_batch)
            total_relationships += rel_count
            processed_exhibitions += len(exhibition_batch)
            
            logger.info(f"Created {rel_count} relationships in this batch")
            logger.info(f"Progress: {processed_exhibitions}/{total_exhibitions} exhibitions")
            
            skip += batch_size
        
        # Create aggregated CO_EXHIBITED_TOTAL relationships
        total_count = self.create_coexhibited_total_relationships()
        
        logger.info("=" * 60)
        logger.info("REBUILD COMPLETE")
        logger.info(f"Processed exhibitions: {processed_exhibitions}")
        logger.info(f"Total CO_EXHIBITED relationships: {total_relationships}")
        logger.info(f"Total CO_EXHIBITED_TOTAL relationships: {total_count}")
        logger.info("=" * 60)
    
    def get_statistics(self):
        """Get statistics about the relationships."""
        with self.driver.session() as session:
            # Get artist count
            result = session.run("MATCH (a:Artist) RETURN count(a) as count")
            artist_count = result.single(strict=True)["count"]
            
            # Get CO_EXHIBITED count
            result = session.run("MATCH ()-[r:CO_EXHIBITED]->() RETURN count(r) as count")
            coexhibited_count = result.single(strict=True)["count"]
            
            # Get CO_EXHIBITED_TOTAL count
            result = session.run("MATCH ()-[r:CO_EXHIBITED_TOTAL]->() RETURN count(r) as count")
            coexhibited_total_count = result.single(strict=True)["count"]
            
            # Get top collaborators
            result = session.run("""
                MATCH (a1:Artist)-[r:CO_EXHIBITED_TOTAL]->(a2:Artist)
                RETURN a1.name as artist1, a2.name as artist2, r.count as exhibitions
                ORDER BY r.count DESC
                LIMIT 10
            """)
            top_collaborators = [dict(record) for record in result]
            
            logger.info("=" * 60)
            logger.info("DATABASE STATISTICS")
            logger.info(f"Total artists: {artist_count}")
            logger.info(f"Total CO_EXHIBITED relationships: {coexhibited_count}")
            logger.info(f"Total CO_EXHIBITED_TOTAL relationships: {coexhibited_total_count}")
            logger.info("\nTop 10 artist collaborations:")
            for i, collab in enumerate(top_collaborators, 1):
                logger.info(f"{i}. {collab['artist1']} <-> {collab['artist2']}: {collab['exhibitions']} exhibitions")
            logger.info("=" * 60)



import argparse

def main():
    """Main execution function with CLI flags."""
    parser = argparse.ArgumentParser(description="Rebuild CO_EXHIBITED and CO_EXHIBITED_TOTAL relationships.")
    parser.add_argument('--skip-clear', action='store_true', help='Skip deleting all existing CO_EXHIBITED and CO_EXHIBITED_TOTAL relationships')
    parser.add_argument('--only-total', action='store_true', help='Only calculate CO_EXHIBITED_TOTAL relationships (do not rebuild CO_EXHIBITED)')
    parser.add_argument('--only-coexhibited', action='store_true', help='Only rebuild CO_EXHIBITED relationships (do not calculate CO_EXHIBITED_TOTAL)')
    parser.add_argument('--batch-size', type=int, default=int(os.getenv("BATCH_SIZE", "50")), help='Batch size for processing exhibitions')
    args = parser.parse_args()

    # Get Neo4j credentials from environment variables or use defaults
    NEO4J_URI = os.getenv("NEO4J_URI", "bolt://localhost:7687")
    NEO4J_USER = os.getenv("NEO4J_USER", "neo4j")
    NEO4J_PASSWORD = os.getenv("NEO4J_PASSWORD", "admin123")

    logger.info("CO_EXHIBITED Relationship Rebuild Script")
    logger.info("=" * 60)

    builder = None
    try:
        builder = CoExhibitedRelationshipBuilder(NEO4J_URI, NEO4J_USER, NEO4J_PASSWORD)

        if args.only_total:
            # Only calculate CO_EXHIBITED_TOTAL
            builder.create_coexhibited_total_relationships()
        elif args.only_coexhibited:
            # Only rebuild CO_EXHIBITED (optionally skip clearing)
            builder.rebuild_relationships(batch_size=args.batch_size, clear_existing=not args.skip_clear)
        else:
            # Default: rebuild CO_EXHIBITED (optionally skip clearing) and then CO_EXHIBITED_TOTAL
            builder.rebuild_relationships(batch_size=args.batch_size, clear_existing=not args.skip_clear)
            builder.create_coexhibited_total_relationships()

        builder.get_statistics()

    except Exception as e:
        logger.error(f"Error during execution: {str(e)}", exc_info=True)
        raise
    finally:
        if builder:
            builder.close()


if __name__ == "__main__":
    main()
