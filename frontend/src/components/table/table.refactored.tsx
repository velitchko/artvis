import React, { useState, useEffect, useCallback, useMemo } from 'react';
import _ from 'lodash';
import { DocumentNode } from 'graphql';
import client from '../apollo/client';
import { Artist } from '../../models/artist.model';
import { Exhibition } from '../../models/exhibition.model';
import { Item } from '../../models/item.model';
import { Location } from '../../models/location.model';
import { Venue } from '../../models/venue.model';

// Types
interface TableProps {
    query: DocumentNode;
    baseId: number;
    compareWith: Artist | null;
    exhibitions: Exhibition[];
}

interface TableState {
    results: {
        artists?: Artist[];
        venues?: Venue[];
        exhibitions?: MetaExhibition[];
        items?: Item[];
    };
    loaded: boolean;
    sortDirection: 'asc' | 'desc';
}

interface MetaExhibition extends Exhibition {
    isCommon: boolean;
    percentBase: number;
    percentCompare: number;
}

interface SortableColumn {
    key: string;
    label: string;
    sortable: boolean;
    render: (exhibition: MetaExhibition) => React.ReactNode;
}

// Constants
const YEAR_RANGE = { min: 1905, max: 1915 };

// Utility functions
const isValidExhibition = (exhibition: Exhibition): boolean => {
    return exhibition.startyear >= YEAR_RANGE.min && (exhibition.endyear || exhibition.startyear) <= YEAR_RANGE.max;
};

const calculatePercentage = (exhibition: MetaExhibition, artistId: number): number => {
    if (!exhibition || !exhibition.exhibitsItems) {
        console.log('calculatePercentage: No exhibition or exhibitsItems');
        return 0;
    }

    const totalArtworksExhibited = exhibition.exhibitsItems.length;
    if (totalArtworksExhibited === 0) {
        console.log('calculatePercentage: No artworks in exhibition');
        return 0;
    }

    // Count items created by the specific artist - handle BigInt comparison
    const artWorksByArtist = exhibition.exhibitsItems.filter((item: Item) => 
        item.artistsCreated?.some((artist: Artist) => {
            // Handle both string and number comparison since IDs might be BigInt
            const artistIdStr = String(artist.id);
            const targetIdStr = String(artistId);
            const matches = artistIdStr === targetIdStr;
            if (matches) {
                console.log(`Found match: item artist ID ${artistIdStr} === target ${targetIdStr}`);
            }
            return matches;
        })
    ).length;

    const percentage = (artWorksByArtist / totalArtworksExhibited) * 100;
    console.log(`calculatePercentage for artist ${artistId}: ${artWorksByArtist}/${totalArtworksExhibited} = ${percentage.toFixed(2)}%`);
    return Number(percentage.toFixed(2));
};

const getCountryAndCity = (exhibition: MetaExhibition): string => {
    if (!exhibition.tookPlaceAtLocations?.length || 
        !exhibition.tookPlaceAtLocations[0].locatedAtGeonames?.length) {
        return 'N/A';
    }
    
    const location = exhibition.tookPlaceAtLocations[0].locatedAtGeonames[0];
    return `${location.name} (${location.country_code})`;
};

const getHost = (locations: Location[]): string => {
    return locations?.[0]?.name || 'N/A';
};

// Custom hooks
const useTableData = (query: DocumentNode, exhibitionIds: number[], baseId: number) => {
    console.log('Fetching data for exhibition IDs:', exhibitionIds);
    console.log('Query:', query);
    const [state, setState] = useState<TableState>({
        results: { exhibitions: [] },
        loaded: false,
        sortDirection: 'asc'
    });

    const fetchData = useCallback(async () => {
        if (!exhibitionIds.length || state.loaded) return;

        try {
            const result = await client.query({
                query,
                variables: {
                    where: { id_IN: exhibitionIds.map(id => id.toString()) }
                }
            });

            console.log('Fetched exhibitions:', result.data.exhibitions);

            const exhibitions = result.data.exhibitions
                .map((e: Exhibition) => ({
                    ...e,
                    startyear: Number(e.startyear),
                    endyear: Number(e.endyear),
                    id: Number(e.id)
                }))
                .filter(isValidExhibition)
                .sort((a: Exhibition, b: Exhibition) => a.startyear - b.startyear)
                .map((exhibition: Exhibition): MetaExhibition => ({
                    ...exhibition,
                    isCommon: false,
                    percentBase: calculatePercentage(exhibition as MetaExhibition, baseId),
                    percentCompare: 0
                }));

            setState(prev => ({
                ...prev,
                results: { ...prev.results, exhibitions },
                loaded: true
            }));
        } catch (error) {
            console.error('Error fetching exhibition data:', error);
        }
    }, [query, exhibitionIds, baseId, state.loaded]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    return { state, setState };
};

// Table columns configuration - create base columns that can be enhanced with compare column
const createBaseColumns = (): SortableColumn[] => [
    {
        key: 'startyear',
        label: 'Date',
        sortable: true,
        render: (exhibition) => <span>{exhibition.startyear}</span>
    },
    {
        key: 'location',
        label: 'City (Country)',
        sortable: true,
        render: (exhibition) => <span>{getCountryAndCity(exhibition)}</span>
    },
    {
        key: 'title',
        label: 'Exhibition Title',
        sortable: true,
        render: (exhibition) => (
            <div className="max-w-xs truncate" title={exhibition.title}>
                {exhibition.title}
            </div>
        )
    },
    {
        key: 'exhibitsItems.length',
        label: 'Items',
        sortable: true,
        render: (exhibition) => <span>{exhibition.exhibitsItems?.length || 0}</span>
    },
    {
        key: 'percentBase',
        label: 'Base %',
        sortable: true,
        render: (exhibition) => <span>{exhibition.percentBase || 0}%</span>
    }
];

// Create columns with optional compare column inserted after Base %
const createColumns = (includeCompare: boolean = false): SortableColumn[] => {
    const baseColumns = createBaseColumns();
    
    if (includeCompare) {
        // Insert compare column after Base % (index 4)
        baseColumns.splice(5, 0, {
            key: 'percentCompare',
            label: 'Compare %',
            sortable: true,
            render: (exhibition) => (
                <span>{exhibition.isCommon ? `${exhibition.percentCompare}%` : '-'}</span>
            )
        });
    }
    
    // Add Artists column at the end
    baseColumns.push({
        key: 'artistsExhibitedAt.length',
        label: 'Artists',
        sortable: true,
        render: (exhibition) => <span>{_.uniqBy(exhibition.artistsExhibitedAt, 'id').length}</span>
    });
    
    return baseColumns;
};

// Main component
const TableComponent: React.FC<TableProps> = ({
    query,
    baseId,
    compareWith,
    exhibitions
}) => {
    const exhibitionIds = useMemo(
        () => exhibitions?.map((exhibition: Exhibition) => Number(exhibition.id)) || [],
        [exhibitions]
    );

    const { state, setState } = useTableData(query, exhibitionIds, baseId);
    const columns = useMemo(() => createColumns(!!compareWith), [compareWith]);

    // Update comparison data when compareWith changes
    useEffect(() => {
        if (!state.results.exhibitions) return;

        // If compareWith is null, reset all comparison data
        if (!compareWith) {
            console.log('Resetting table comparison data');
            const resetExhibitions = state.results.exhibitions.map((exhibition) => ({
                ...exhibition,
                isCommon: false,
                percentCompare: 0
            }));

            setState(prev => ({
                ...prev,
                results: { ...prev.results, exhibitions: resetExhibitions }
            }));
            return;
        }

        console.log('Updating table comparison data for artist:', compareWith.firstname, compareWith.lastname);
        console.log('Compare artist ID:', compareWith.id, 'Type:', typeof compareWith.id);
        console.log('Compare artist exhibitions:', compareWith.exhibitedAtExhibitions?.length || 0);

        const updatedExhibitions = state.results.exhibitions.map((exhibition) => {
            const isCommon = compareWith.exhibitedAtExhibitions?.some(
                (exh: Exhibition) => String(exh.id) === String(exhibition.id)
            ) || false;

            const percentCompare = isCommon ? calculatePercentage(exhibition, Number(compareWith.id)) : 0;
            
            if (isCommon) {
                console.log(`Exhibition ${exhibition.id} is common. Calculating percentage for artist ${compareWith.id}:`, percentCompare);
                console.log('Exhibition items:', exhibition.exhibitsItems?.length || 0);
                console.log('Exhibition title:', exhibition.title);
            }

            return {
                ...exhibition,
                isCommon,
                percentCompare
            };
        });

        // Sort by common exhibitions first
        const sortedExhibitions = _.sortBy(updatedExhibitions, [
            (e) => !e.isCommon, // Common exhibitions first
            'startyear' // Then by start year
        ]);

        setState(prev => ({
            ...prev,
            results: { ...prev.results, exhibitions: sortedExhibitions }
        }));
    }, [compareWith, setState]);

    // Sorting functionality
    const handleSort = useCallback((columnKey: string) => {
        if (!state.results.exhibitions) return;

        const sortedExhibitions = [...state.results.exhibitions];

        if (columnKey.includes('.length')) {
            const [property] = columnKey.split('.');
            _.sortBy(sortedExhibitions, exhibition => {
                const prop = exhibition[property as keyof MetaExhibition] as any[];
                return _.uniqBy(prop || [], 'id').length;
            });
        } else if (columnKey === 'host') {
            _.sortBy(sortedExhibitions, exhibition => 
                getHost(exhibition.tookPlaceAtLocations)
            );
        } else if (columnKey === 'location') {
            _.sortBy(sortedExhibitions, exhibition => 
                getCountryAndCity(exhibition)
            );
        } else {
            _.sortBy(sortedExhibitions, columnKey);
        }

        if (state.sortDirection === 'desc') {
            sortedExhibitions.reverse();
        }

        setState(prev => ({
            ...prev,
            results: { ...prev.results, exhibitions: sortedExhibitions },
            sortDirection: prev.sortDirection === 'asc' ? 'desc' : 'asc'
        }));
    }, [state.results.exhibitions, state.sortDirection, setState]);



    // Render table header
    const renderTableHeader = () => (
        <thead className="text-xs bg-black text-white uppercase sticky top-0 z-10">
            <tr>
                {columns.map((column) => (
                    <th
                        key={column.key}
                        scope="col"
                        className={`px-2 py-2 border-r border-gray-300 ${
                            column.sortable ? 'cursor-pointer hover:bg-gray-800' : ''
                        }`}
                        onClick={column.sortable ? () => handleSort(column.key) : undefined}
                    >
                        <div className="flex items-center justify-between">
                            {column.label}
                            {column.sortable && (
                                <span className="ml-1">
                                    {state.sortDirection === 'asc' ? '↑' : '↓'}
                                </span>
                            )}
                        </div>
                    </th>
                ))}
            </tr>
        </thead>
    );

    // Render table row
    const renderTableRow = (exhibition: MetaExhibition, index: number) => (
        <tr
            key={exhibition.id}
            className={`border-b ${
                exhibition.isCommon ? 'bg-yellow-50' : index % 2 === 0 ? 'bg-gray-50' : 'bg-white'
            } hover:bg-blue-50 transition-colors`}
        >
            {columns.map((column) => (
                <td key={column.key} className="px-2 py-2 border-r border-gray-300 text-sm">
                    {column.render(exhibition)}
                </td>
            ))}
        </tr>
    );

    // Loading state
    if (!state.loaded) {
        return (
            <div className="h-full flex items-center justify-center">
                <div className="text-gray-500">Loading exhibitions...</div>
            </div>
        );
    }

    // Empty state
    if (!state.results.exhibitions?.length) {
        return (
            <div className="h-full flex items-center justify-center">
                <div className="text-gray-500">No exhibitions found</div>
            </div>
        );
    }

    return (
        <div className="table-container h-full flex flex-col">
            {/* Table */}
            <div 
                className="flex-1 overflow-y-scroll border border-gray-300 rounded"
                style={{
                    minHeight: 0,
                    maxHeight: '100%'
                }}
            >
                <table className="w-full text-left text-black">
                    {renderTableHeader()}
                    <tbody>
                        {state.results.exhibitions.map((exhibition, index) =>
                            renderTableRow(exhibition, index)
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default TableComponent;
