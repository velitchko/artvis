import React from 'react';
import { Link } from 'react-router-dom';
import { colors } from '../../colors/colors';

const ResultsComponent = (props: any) => {
    const results = React.useRef(props.results);
    const value = React.useRef(props.value);
    const onClick = props.onClick;
    const [showResults, setShowResults] = React.useState(true);

    console.log(results);
    console.log(value);

    const handleSelect = (id: string) => {
        // console.log(event)
        onClick(id);
        setShowResults(false);
    }

    return (
        <ul className="bg-white border border-gray-100 w-full mt-2 overflow-y-auto h-auto max-h-[35vh]">
            {
                showResults && results.current.map((result: { id: string, name: string, type: string }, index: number) => {
                    return (
                        <li key={index} className="pl-8 pr-2 py-1 border-b-2 border-gray-100 relative cursor-pointer hover:bg-yellow-50 hover:text-gray-900">
                            <div className="inline-block">
                                {/* <Link to={{ pathname: "network" }} state={{ id: result.id }} relative="path"> */}
                                <button onClick={() => { handleSelect(result.id) }}>
                                    <svg className="absolute w-4 h-4 left-2 top-2" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M12.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
                                    </svg>
                                    <span className={`px-2 py-0 mr-2 rounded-full text-white font-semibold text-sm ${colors.get(result.type)}`}>
                                        {result.type}
                                        </span>
                                        <p className="inline-block" dangerouslySetInnerHTML={{
                                            __html:
                                            result.name.replace(new RegExp(value.current, 'gi'), (match) => {
                                                return `<b>${match}</b>`
                                            })
                                        }}>
                                        </p>
                                    </button>
                                {/* </Link> */}
                            </div>
                        </li>
                    );
                })
            }
        </ul>
    )
};

export default ResultsComponent;