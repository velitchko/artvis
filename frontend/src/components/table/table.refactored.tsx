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
    if (!exhibition.exhibitsItems?.length) return 0;

    const totalArtworks = exhibition.exhibitsItems.length;
    const artistArtworks = exhibition.exhibitsItems.filter((item: Item) =>
        item.artistsCreated.some((artist: Artist) => artist.id === artistId)
    ).length;

    return Number(((artistArtworks / totalArtworks) * 100).toFixed(2));
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

// Table columns configuration
const createColumns = (): SortableColumn[] => [
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
        key: 'startyear',
        label: 'Start Year',
        sortable: true,
        render: (exhibition) => <span>{exhibition.startyear}</span>
    },
    {
        key: 'endyear',
        label: 'End Year',
        sortable: true,
        render: (exhibition) => <span>{exhibition.endyear}</span>
    },
    {
        key: 'location',
        label: 'Location',
        sortable: true,
        render: (exhibition) => <span>{getCountryAndCity(exhibition)}</span>
    },
    {
        key: 'host',
        label: 'Host',
        sortable: true,
        render: (exhibition) => <span>{getHost(exhibition.tookPlaceAtLocations)}</span>
    },
    {
        key: 'artistsExhibitedAt.length',
        label: 'Artists',
        sortable: true,
        render: (exhibition) => <span>{_.uniqBy(exhibition.artistsExhibitedAt, 'id').length}</span>
    },
    {
        key: 'percentBase',
        label: 'Base %',
        sortable: true,
        render: (exhibition) => <span>{exhibition.percentBase}%</span>
    }
];

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
    const columns = useMemo(() => createColumns(), []);

    // Update comparison data when compareWith changes
    useEffect(() => {
        if (!compareWith || !state.results.exhibitions) return;

        const updatedExhibitions = state.results.exhibitions.map((exhibition) => {
            const isCommon = compareWith.exhibitedAtExhibitions?.some(
                (exh: Exhibition) => Number(exh.id) === exhibition.id
            ) || false;

            return {
                ...exhibition,
                isCommon,
                percentCompare: isCommon ? calculatePercentage(exhibition, compareWith.id) : 0
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

    // Reset comparison
    const handleReset = useCallback(() => {
        if (!state.results.exhibitions) return;

        const resetExhibitions = state.results.exhibitions
            .map(exhibition => ({
                ...exhibition,
                isCommon: false,
                percentCompare: 0
            }))
            .sort((a, b) => a.startyear - b.startyear);

        setState(prev => ({
            ...prev,
            results: { ...prev.results, exhibitions: resetExhibitions }
        }));
    }, [state.results.exhibitions, setState]);

    // Render table header
    const renderTableHeader = () => (
        <thead className="text-xs bg-black text-white uppercase sticky top-0">
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
                {compareWith && (
                    <th scope="col" className="px-2 py-2 border-r border-gray-300">
                        Compare %
                    </th>
                )}
                <th scope="col" className="px-2 py-2">
                    Actions
                </th>
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
            {compareWith && (
                <td className="px-2 py-2 border-r border-gray-300 text-sm">
                    {exhibition.isCommon ? `${exhibition.percentCompare}%` : '-'}
                </td>
            )}
            <td className="px-2 py-2 text-sm">
                <button
                    className="text-blue-600 hover:text-blue-800 text-xs underline"
                    onClick={() => {
                        // Handle view details action
                        console.log('View details for exhibition:', exhibition.id);
                    }}
                >
                    Details
                </button>
            </td>
        </tr>
    );

    // Loading state
    if (!state.loaded) {
        return (
            <div className="flex items-center justify-center h-32">
                <div className="text-gray-500">Loading exhibitions...</div>
            </div>
        );
    }

    // Empty state
    if (!state.results.exhibitions?.length) {
        return (
            <div className="flex items-center justify-center h-32">
                <div className="text-gray-500">No exhibitions found</div>
            </div>
        );
    }

    return (
        <div className="table-container">
            {/* Table controls */}
            <div className="table-controls mb-4 flex justify-between items-center">
                <div className="text-sm text-gray-600">
                    Showing {state.results.exhibitions.length} exhibitions
                    {compareWith && (
                        <span className="ml-2">
                            (Common: {state.results.exhibitions.filter(e => e.isCommon).length})
                        </span>
                    )}
                </div>
                
                {compareWith && (
                    <button
                        onClick={handleReset}
                        className="px-3 py-1 text-xs bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors"
                    >
                        Reset Comparison
                    </button>
                )}
            </div>

            {/* Table */}
            <div className="overflow-auto max-h-96 border border-gray-300 rounded">
                <table className="w-full text-left text-black">
                    {renderTableHeader()}
                    <tbody>
                        {state.results.exhibitions.map((exhibition, index) =>
                            renderTableRow(exhibition, index)
                        )}
                    </tbody>
                </table>
            </div>

            {/* Table footer */}
            <div className="table-footer mt-2 text-xs text-gray-500">
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1">
                        <div className="w-3 h-3 bg-yellow-50 border border-yellow-200"></div>
                        <span>Common exhibitions</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <div className="w-3 h-3 bg-gray-50 border border-gray-200"></div>
                        <span>Base artist only</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TableComponent;
