import React from 'react';

class ProgressHeadingComponent extends React.Component<{}, {}> {

    constructor(props: {}) {
        super(props);
    }

    render() {
        return (
            <div className="fixed top-2 left-2 w-auto m-auto">
                <a href="/" className="flex items-center justify-center">
                    <h1 className="text-l mt-2 lg:mt-0 font-extrabold tracking-tight leading-none text-gray-900 md:text-3xl lg:text-5xl">
                        Art
                        <span className="font-face-kolker md:text-6xl lg:text-7xl">Vis</span>

                    </h1>

                    <span className="ml-60 px-3 py-1 text-5xl font-semibold bg-gray-300 text-gray-600">
                        BETA Version, View under Construction
                    </span>

                </a>
            </div>


        );
    }
};

export default ProgressHeadingComponent;