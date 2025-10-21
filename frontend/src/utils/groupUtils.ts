import { Group } from '../models/group.model';
import { Artist } from '../models/artist.model';
import { Exhibition } from '../models/exhibition.model';
import { Link } from '../models/link';
import { Node } from '../models/node';

// Constants
const YEAR_RANGE = { min: 1905, max: 1915 };

export interface GroupStatistics {
    totalMembers: number;
    totalExhibitions: number;
    totalArtworks: number;
    uniqueExhibitions: Set<number>;
    dateRange: { min: number; max: number };
    exhibitionsPerYear: Map<number, Set<number>>;
    itemsPerYear: Map<number, number>;
}

export interface TimelineData {
    year: number;
    exhibitions: number;
    items: number;
}

/**
 * Calculate aggregate statistics for a group based on all member activities
 */
export const calculateGroupStatistics = (group: Group): GroupStatistics => {
    const uniqueExhibitions = new Set<number>();
    const exhibitionsPerYear = new Map<number, Set<number>>();
    const itemsPerYear = new Map<number, number>();
    let totalArtworks = 0;
    let minYear = 1905;
    let maxYear = 1915;

    if (!group.artistsMemberOf || group.artistsMemberOf.length === 0) {
        return {
            totalMembers: 0,
            totalExhibitions: 0,
            totalArtworks: 0,
            uniqueExhibitions: new Set(),
            dateRange: { min: YEAR_RANGE.min, max: YEAR_RANGE.max },
            exhibitionsPerYear: new Map(),
            itemsPerYear: new Map()
        };
    }

    // Aggregate data from all members
    group.artistsMemberOf.forEach((member: Artist) => {
        if (!member.exhibitedAtExhibitions) return;

        member.exhibitedAtExhibitions.forEach((exhibition: Exhibition) => {
            const year = +exhibition.startyear;
            const exhibitionId = +exhibition.id;

            // Track unique exhibitions
            uniqueExhibitions.add(exhibitionId);

            // Track year range
            if (year < minYear) minYear = year;
            if (year > maxYear) maxYear = year;

            // Track exhibitions per year
            if (year >= YEAR_RANGE.min && year <= YEAR_RANGE.max) {
                if (!exhibitionsPerYear.has(year)) {
                    exhibitionsPerYear.set(year, new Set());
                }
                exhibitionsPerYear.get(year)?.add(exhibitionId);

                // Track items per year
                const itemCount = exhibition.exhibitsItems?.length || 0;
                itemsPerYear.set(year, (itemsPerYear.get(year) || 0) + itemCount);
                totalArtworks += itemCount;
            }
        });
    });

    return {
        totalMembers: group.artistsMemberOf.length,
        totalExhibitions: uniqueExhibitions.size,
        totalArtworks,
        uniqueExhibitions,
        dateRange: { 
            min: minYear === Infinity ? YEAR_RANGE.min : minYear, 
            max: maxYear === -Infinity ? YEAR_RANGE.max : maxYear 
        },
        exhibitionsPerYear,
        itemsPerYear
    };
};

/**
 * Process group exhibition data for timeline visualization
 */
export const processGroupTimelineData = (group: Group): TimelineData[] => {
    const stats = calculateGroupStatistics(group);
    const exhibitionData = Array.from(stats.exhibitionsPerYear.entries())
        .map(([year, set]) => ({ year, count: set.size }))
        .sort((a, b) => a.year - b.year);

    const itemsData = Array.from(stats.itemsPerYear.entries())
        .map(([year, count]) => ({ year, count }))
        .sort((a, b) => a.year - b.year);

    return exhibitionData.map(exhibition => {
        const items = itemsData.find(item => item.year === exhibition.year)?.count || 0;
        return {
            year: exhibition.year,
            exhibitions: exhibition.count,
            items
        };
    });
};

/**
 * Create timeline data with all years filled in (including zeros)
 */
export const createTimelineWithMissingYears = (data: TimelineData[]): TimelineData[] => {
    const years = Array.from(
        { length: YEAR_RANGE.max - YEAR_RANGE.min + 1 }, 
        (_, i) => i + YEAR_RANGE.min
    );

    return years.map(year => {
        const existing = data.find(d => d.year === year);
        return existing || { year, exhibitions: 0, items: 0 };
    });
};

/**
 * Generate network data showing connections between group members
 * based on co-exhibition patterns
 */
export const generateGroupNetworkData = (group: Group): Link[] => {
    if (!group.artistsMemberOf || group.artistsMemberOf.length === 0) {
        return [];
    }

    const links: Link[] = [];
    const members = group.artistsMemberOf;

    // Build a map of exhibition ID to list of members who exhibited there
    const exhibitionToMembers = new Map<number, Artist[]>();

    members.forEach(member => {
        if (!member.exhibitedAtExhibitions) return;

        member.exhibitedAtExhibitions.forEach(exhibition => {
            const exhibitionId = +exhibition.id;
            if (!exhibitionToMembers.has(exhibitionId)) {
                exhibitionToMembers.set(exhibitionId, []);
            }
            exhibitionToMembers.get(exhibitionId)?.push(member);
        });
    });

    // Create links between members who co-exhibited
    const coexhibMap = new Map<string, Map<number, Set<number>>>();

    exhibitionToMembers.forEach((exhibitingMembers, exhibitionId) => {
        if (exhibitingMembers.length < 2) return;

        // Get the exhibition year
        const exhibition = exhibitingMembers[0].exhibitedAtExhibitions?.find(
            e => +e.id === exhibitionId
        );
        if (!exhibition) return;

        const year = +exhibition.startyear;
        if (year < YEAR_RANGE.min || year > YEAR_RANGE.max) return;

        // Create links between all pairs of co-exhibiting members
        for (let i = 0; i < exhibitingMembers.length; i++) {
            for (let j = i + 1; j < exhibitingMembers.length; j++) {
                const member1 = exhibitingMembers[i];
                const member2 = exhibitingMembers[j];

                // Create a consistent key for the pair
                const key = [member1.id, member2.id].sort().join('-');

                if (!coexhibMap.has(key)) {
                    coexhibMap.set(key, new Map());
                }

                const yearMap = coexhibMap.get(key)!;
                if (!yearMap.has(year)) {
                    yearMap.set(year, new Set());
                }
                yearMap.get(year)?.add(exhibitionId);
            }
        }
    });

    // Convert the map to Link objects
    coexhibMap.forEach((yearMap, key) => {
        const [id1, id2] = key.split('-').map(Number);
        const member1 = members.find(m => +m.id === id1);
        const member2 = members.find(m => +m.id === id2);

        if (!member1 || !member2) return;

        const source: Node = {
            id: member1.id,
            name: member1.sortname,
            type: 'artist',
            props: { data: member1 }
        };

        const target: Node = {
            id: member2.id,
            name: member2.sortname,
            type: 'artist',
            props: { data: member2 }
        };

        yearMap.forEach((exhibitionIds, year) => {
            const link: Link = {
                sourceId: +source.id,
                targetId: +target.id,
                props: {
                    data: {
                        year: year,
                        count: exhibitionIds.size
                    }
                },
                source: source,
                target: target
            };

            links.push(link);
        });
    });

    return links;
};

/**
 * Get all unique exhibitions from all group members
 */
export const getAllGroupExhibitions = (group: Group): Array<Exhibition & { exhibitingMembers: Artist[] }> => {
    if (!group.artistsMemberOf || group.artistsMemberOf.length === 0) {
        return [];
    }

    const exhibitionMap = new Map<number, Exhibition & { exhibitingMembers: Artist[] }>();

    group.artistsMemberOf.forEach(member => {
        if (!member.exhibitedAtExhibitions) return;

        member.exhibitedAtExhibitions.forEach(exhibition => {
            const id = +exhibition.id;
            
            if (!exhibitionMap.has(id)) {
                exhibitionMap.set(id, {
                    ...exhibition,
                    exhibitingMembers: []
                });
            }
            
            exhibitionMap.get(id)?.exhibitingMembers.push(member);
        });
    });

    return Array.from(exhibitionMap.values()).sort((a, b) => 
        +b.startyear - +a.startyear
    );
};
