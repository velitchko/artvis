import logging
from datetime import datetime
# Logging setup
log_filename = f'validate_coexhibited_{datetime.now().strftime("%Y%m%d_%H%M%S")}.log'
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler(log_filename),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

import os
from dotenv import load_dotenv
from neo4j import GraphDatabase

# Load environment variables
load_dotenv(os.path.join(os.path.dirname(__file__), '.env'))
NEO4J_URI = os.getenv("NEO4J_URI", "bolt://localhost:7687")
NEO4J_USER = os.getenv("NEO4J_USER", "neo4j")
NEO4J_PASSWORD = os.getenv("NEO4J_PASSWORD", "password")

# Create Neo4j driver instance
driver = GraphDatabase.driver(NEO4J_URI, auth=(NEO4J_USER, NEO4J_PASSWORD))

def fetch_artist_exhibition_relationships():
    query = """
    MATCH (a:Artist)-[:EXHIBITED_AT]->(e:Exhibition)<-[:EXHIBITED_AT]-(b:Artist)
    WHERE a.id <> b.id
    RETURN a.id AS artist_id_1, e.id AS exhibition_id, b.id AS artist_id_2
    """
    with driver.session() as session:
        return list(session.run(query))

def process_artist_exhibition_records(records):
    pairs = set()
    for record in records:
        id1, eid, id2 = record["artist_id_1"], record["exhibition_id"], record["artist_id_2"]
        pair = tuple(sorted([id1, id2])) + (eid,)
        pairs.add(pair)
    return list(pairs)

def fetch_coexhibited_relationships():
    query = """
    MATCH (a:Artist)-[r:CO_EXHIBITED]-(b:Artist)
    WHERE a.id <> b.id
    RETURN a.id AS artist_id_1, r.exhibitions AS exhibitions, b.id AS artist_id_2
    """
    with driver.session() as session:
        return list(session.run(query))

def process_coexhibited_records(records):
    pairs = set()
    for record in records:
        id1, id2 = record["artist_id_1"], record["artist_id_2"]
        exhibitions = record["exhibitions"]
        for eid in exhibitions:
            pair = tuple(sorted([id1, id2])) + (eid,)
            pairs.add(pair)
    return list(pairs)


def collect_artist_exhibition_pairs(artist_exhibition_data):
    exhibition_to_artists = defaultdict(set)
    for artist_id, exhibition_id in artist_exhibition_data:
        exhibition_to_artists[exhibition_id].add(artist_id)
    return exhibition_to_artists


def generate_coexhibited_pairs(exhibition_to_artists):
    pairs = set()
    for exhibition_id, artists in exhibition_to_artists.items():
        artist_list = list(artists)
        for i in range(len(artist_list)):
            for j in range(i + 1, len(artist_list)):
                pairs.add((artist_list[i], artist_list[j], exhibition_id))
    return pairs


def save_to_csv(filename, rows, header):
    with open(filename, 'w', newline='') as f:
        writer = csv.writer(f)
        writer.writerow(header)
        writer.writerows(rows)


def validate_relationships():
    logger.info("Starting validation of co-exhibited relationships...")
    logger.info("Step 1: Fetching artist-exhibition relationships.")
    artist_exhibition_records = fetch_artist_exhibition_relationships()
    logger.info("Step 2: Fetching co-exhibited relationships.")
    coexhibited_records = fetch_coexhibited_relationships()

    logger.info("Step 3: Processing artist-exhibition records.")
    artist_exhibition_data = process_artist_exhibition_records(artist_exhibition_records)
    logger.info("Step 4: Processing co-exhibited records.")
    coexhibited_data = process_coexhibited_records(coexhibited_records)

    logger.info("Step 5: Collecting exhibition-to-artist pairs.")
    exhibition_to_artists = collect_artist_exhibition_pairs(artist_exhibition_data)
    logger.info("Step 6: Generating expected co-exhibited pairs.")
    expected_pairs = generate_coexhibited_pairs(exhibition_to_artists)

    logger.info(f"Saving {len(expected_pairs)} expected pairs to CSV.")
    save_to_csv('expected_coexhibited.csv', list(expected_pairs), ['artist_id_1', 'artist_id_2', 'exhibition_id'])
    logger.info(f"Saving {len(coexhibited_data)} actual pairs to CSV.")
    save_to_csv('actual_coexhibited.csv', coexhibited_data, ['artist_id_1', 'artist_id_2', 'exhibition_id'])

    logger.info("Step 7: Cross-checking relationships.")
    expected_set = set(expected_pairs)
    actual_set = set(coexhibited_data)

    missing = expected_set - actual_set
    extra = actual_set - expected_set

    logger.info(f"Missing relationships: {len(missing)}")
    logger.info(f"Extra relationships: {len(extra)}")
    if missing:
        logger.info(f"Saving {len(missing)} missing relationships to CSV.")
        save_to_csv('missing_relationships.csv', list(missing), ['artist_id_1', 'artist_id_2', 'exhibition_id'])
    if extra:
        logger.info(f"Saving {len(extra)} extra relationships to CSV.")
        save_to_csv('extra_relationships.csv', list(extra), ['artist_id_1', 'artist_id_2', 'exhibition_id'])

if __name__ == "__main__":
    try:
        validate_relationships()
    finally:
        driver.close()
