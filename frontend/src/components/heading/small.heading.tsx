import React from 'react';

class SmallHeadingComponent extends React.Component<{}, { }> {

    constructor(props: {}) {
        super(props);
    }

    render() {
        return (
            <div className="fixed top-0 w-full m-auto">
                <a href="/" className="flex items-center justify-center">
                    <h1 className="text-xl mt-2 lg:mt-0 font-extrabold tracking-tight leading-none text-gray-900 md:text-3xl lg:text-5xl">
                        Art
                        <span className="font-face-kolker md:text-6xl lg:text-7xl">Viz</span>
                    </h1>
                </a>
            </div>
        );
    }
};

export default SmallHeadingComponent;