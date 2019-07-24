import React from 'react';

export default class Tooltip extends React.Component {
    constructor(props) {
        super(props);

        this.handleSelect = this.handleSelect.bind(this);
    }

    handleSelect(event) {
        let currentTarget = event.currentTarget;
        let index = currentTarget.dataset["index"];
        this.props.pickTip(this.props.options[index]);
    }

    createItem(item,index) {

        return (
            <li className="tooltip-item" onClick={this.handleSelect} data-index={index}>
                <div className="tooltip-title">{item.name}</div>
                <p className="tooltip-description">{item.description}</p>
            </li>
        );
    }

    createItems() {

        return (
            <ul className="tooltip-content">
                {this.props.options.map((item,index) => this.createItem(item,index))}
            </ul>
        );
    }

    render() {
        return (
            <div className="tooltip-panel" style={{ left: this.props.left + "px", top: this.props.top+"px" }}>
                {this.createItems()}
            </div>
        );
    }
}