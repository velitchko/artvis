import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import client from '../components/apollo/client';
import { Group } from '../models/group.model';
import GET_GROUP from '../queries/group';
import GroupDetailComponent from '../components/groups/group.detail';
import LoadingComponent from '../components/loading/loading';

const GroupDetailPage = () => {
    const { id } = useParams<{ id: string }>();
    
    const [group, setGroup] = useState<Group | null>(null);
    const [loading, setLoading] = useState(true);
    const [moreLoading, setMoreLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const loadCallback = (isLoading: boolean) => {
        setMoreLoading(isLoading);
    };

    useEffect(() => {
        if (!id) {
            setError('No group ID provided');
            setLoading(false);
            return;
        }

        client.query({
            query: GET_GROUP,
            variables: {
                searchId: id
            }
        })
        .then(result => {
            if (result.data.groups && result.data.groups.length > 0) {
                setGroup(result.data.groups[0] as Group);
                setError(null);
            } else {
                setError(`Group not found`);
            }
            setLoading(false);
        })
        .catch(err => {
            console.error('Error loading group:', err);
            setError('Error loading group data');
            setLoading(false);
        });
    }, [id]);

    if (loading) {
        return (
            <LoadingComponent 
                overlay={true} 
                size="large" 
                showLogo={true}
            />
        );
    }

    if (error || !group) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="bg-white rounded-lg shadow-md p-8 max-w-md">
                    <h2 className="text-2xl font-bold text-red-600 mb-4">Error</h2>
                    <p className="text-gray-700">{error || 'Group not found'}</p>
                    <a 
                        href="/" 
                        className="mt-4 inline-block px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                    >
                        Go Home
                    </a>
                </div>
            </div>
        );
    }

    return (
        <React.StrictMode>
            <GroupDetailComponent group={group} loadCallback={loadCallback} />
            {moreLoading && (
                <LoadingComponent 
                    overlay={true} 
                    size="large" 
                    showLogo={true}
                />
            )}
        </React.StrictMode>
    );
};

export default GroupDetailPage;
