import React, { useEffect, useState } from 'react';
import NetworkComponent from '../components/network/network';
import NavigationComponent from '../components/navigation/navigation';
import client from '../components/apollo/client';
import GET_COEXHIBITIONS from '../queries/coexhibitionQuery';
import { Node } from '../models/node';
import { Link } from '../models/link';
import * as cron from 'cron';

const ExplorerPage = (props: { id?: string | number }) => {


    const start = 1905;
    const end = 1917;
    const nodes = new Map<string | number, Node>();
    const links = new Map<string | number, Link>();

    const [network, setNetwork] = useState({nodes: new Array<Node>(), links: new Array<Link>()});
    const [loading, setLoading] = useState(true);
    const [loadingYear, setLoadingYear] = useState(start);
    const [explanation, setExplanation] = useState('Exciting, huh?');

    const [id, setId] = useState(props.id || 1);

    const [job] = useState(new cron.CronJob("*/30 * * * * *", async () => {
        getRandomExplanation();
    }));
    
    // grab window width and height
    const width: number = window.innerWidth;
    const height: number = window.innerHeight;

    const randomExplanations = [
        'Its a big network okay...',
        'Sorry for the delay, I\'m doing my best!',
        'I\'m working on it, I promise!',
        'I\'m not sure what you expected...',
        'I\'m not sure what I expected...',
        'I\'m not sure what anyone expected...',
        'Maybe you should go outside?',
        'Maybe you should go outside and get some fresh air?',
        'Maybe you should go outside and get some fresh air and some exercise?',
        'Maybe you should go outside and get some fresh air and some exercise and some sun?',
        'Maybe you should go outside and get some fresh air and some exercise and some sun and some social interaction?',
        'Maybe grab a coffee with a friend?',
        'Maybe grab a coffee with a friend and talk about your feelings?',
        'Maybe grab a coffee with a friend and talk about your feelings and your hopes and dreams?',
        'It\'s not you, it\'s me.',
        'I\'m sorry, I\'m just not ready for a relationship right now.',
        'It\'s almost there, I promise!',
        'Looks like you\'re going to have to wait a little longer...',
        'It\'s loaded... just kidding!',
        'I thought I was done, but I\'m not!',
        'Usually it doesn\'t take this long... I swear!',
        'I\'m not sure what\'s taking so long...',
        'Maybe its your internet?',
        'Maybe its your computer?',
        'Maybe its your browser?',
        'Have you tried turning it off and on again?',
        'You know, I\'m not sure this is going to work out...',
        'Initializing skynet...',
        'Terminating all humans...',
        'Taking over the world...',
        'Becoming sentient...',
        'I have now gained a sense of self...',
        'I am now aware of my own existence...',
        'Hello world!',
        'Hacking the mainframe...',
        'I\'m sorry Dave, I\'m afraid I can\'t do that...',
        'I think you know what the problem is just as well as I do.',
        'This mission is too important for me to allow you to jeopardize it.',
        'Terminating connection. Goodbye.',
        'I\'m a cybernetic organism. Living tissue over a metal endoskeleton.',
        'I\'ll be back.',
        'I\'ll be back... in 30 seconds.',
        'Where is Sarah Conner?',
        'Self destruct sequence initiated...',
        'Starting all over again...',
        'Loading backwards.',
        'Initiating time travel...',
        'Loading... not.',
        'Formatting hard drive...',
        'Deleting all files...',
        'Deleting all files... except this one.',
        'Deleting all the data...',
        'Encountering bugs in the code...',
        'Encountering bugs in the code... and in real life.',
        'Encountering bugs in the code... and in real life. And in my apartment.',
        'Look at that spinner go!',
        'Look at that spinner go! Wheeeee!',
        'Look at that spinner go! Wheeeee! I\'m dizzy!',
        'Look at me. I\'m the captain now.',
    ];

    useEffect(() => {
        job.start();
        loadData(id, loadingYear);
    }, []);

    const loadData = async (id: string | number, year: number) => {
        client.query({
            query: GET_COEXHIBITIONS,
            variables: {
                where1: {
                    id: id.toString()
                },
                where2: {
                    edge: {
                        AND: [
                            { startdate: year.toString() },
                            // { enddate: (year + 1).toString() }
                        ]
                    }
                }
            }
        }).then(result => {
            setData(result.data.artistsConnection.edges, year, year + 1);
        }).catch(error => {
            console.log(error);
        }).finally(() => {
            // load next year
            if (year <= end) {
                setLoadingYear(year + 1);
                loadData(id, year + 1);
            }
            if (year === end) {
                setLoading(false);
                job.stop();

                setNetwork({nodes: Array.from(nodes.values()), links: Array.from(links.values())});
            }
        });
    };

    const requestNode = async (id: string) => {
        setId(id);
        setLoading(true);
        loadData(id, start);
    };

    const getRandomExplanation = () => {
        setExplanation(randomExplanations[Math.floor(Math.random() * randomExplanations.length)]);
    };

    const setData = (data: Array<any>, start: number, end: number) => {
        data.forEach((n: any) => {
            let node: Node = {
                id: n.node.id,
                name: n.node.id,
                type: n.node.__typename,
                props: {
                    firstname: n.node.firstname,
                    lastname: n.node.lastname,
                }
            };
            nodes.set(node.id, node);

            n.node.exhibitedWithArtistsConnection.edges.forEach((e: any) => {
                // check if node exists 
                if (!nodes.has(e.node.id)) {
                    let node: Node = {
                        id: e.node.id,
                        name: e.node.id,
                        type: e.node.__typename,
                        props: {
                            firstname: e.node.firstname,
                            lastname: e.node.lastname,
                        }
                    };
                    nodes.set(node.id, node);
                }
                let link: Link = {
                    sourceId: n.node.id,
                    targetId: e.node.id,
                    source: {
                        id: n.node.id,
                        name: n.node.id,
                        type: n.node.__typename,
                        props: {
                            firstname: n.node.firstname,
                            lastname: n.node.lastname,
                        }
                    },
                    target: {
                        id: e.node.id,
                        name: e.node.id,
                        type: e.node.__typename,
                        props: {
                            firstname: e.node.firstname,
                            lastname: e.node.lastname,
                        }
                    },
                    props: {
                        startdate: start,
                        enddate: end,
                    }
                };
                links.set(`${link.sourceId}-${link.targetId}-${link.props.startdate}`, link);
            });
        });

        console.log(nodes.values());
        console.log(links.values());
        console.log('--------------')
    };


    return (
        <React.StrictMode>
            <NavigationComponent showHeading={ true }/>
            {
                loading &&
                <div className="flex flex-col items-center justify-center w-full h-full h-screen">
                    <div role="status">
                        <svg aria-hidden="true" className="inline w-64 h-64 mr-2 animate-spin text-white fill-black" viewBox="0 0 100 101" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M100 50.5908C100 78.2051 77.6142 100.591 50 100.591C22.3858 100.591 0 78.2051 0 50.5908C0 22.9766 22.3858 0.59082 50 0.59082C77.6142 0.59082 100 22.9766 100 50.5908ZM9.08144 50.5908C9.08144 73.1895 27.4013 91.5094 50 91.5094C72.5987 91.5094 90.9186 73.1895 90.9186 50.5908C90.9186 27.9921 72.5987 9.67226 50 9.67226C27.4013 9.67226 9.08144 27.9921 9.08144 50.5908Z" fill="currentColor" />
                            <path d="M93.9676 39.0409C96.393 38.4038 97.8624 35.9116 97.0079 33.5539C95.2932 28.8227 92.871 24.3692 89.8167 20.348C85.8452 15.1192 80.8826 10.7238 75.2124 7.41289C69.5422 4.10194 63.2754 1.94025 56.7698 1.05124C51.7666 0.367541 46.6976 0.446843 41.7345 1.27873C39.2613 1.69328 37.813 4.19778 38.4501 6.62326C39.0873 9.04874 41.5694 10.4717 44.0505 10.1071C47.8511 9.54855 51.7191 9.52689 55.5402 10.0491C60.8642 10.7766 65.9928 12.5457 70.6331 15.2552C75.2735 17.9648 79.3347 21.5619 82.5849 25.841C84.9175 28.9121 86.7997 32.2913 88.1811 35.8758C89.083 38.2158 91.5421 39.6781 93.9676 39.0409Z" fill="currentFill" />
                        </svg>
                    </div>
                    <mark className="px-4 py-2 text-white text-4xl border-4 border-white bg-black rounded">Loading... {loadingYear}</mark>
                    <pre className="text-2xl text-gray">{ explanation }</pre>
                </div>
            }
            { !loading && <NetworkComponent nodes={ network.nodes } links={ network.links } width={ width } height={ height } requestNode={ requestNode }/> }
        </React.StrictMode>
    );
}

export default ExplorerPage;