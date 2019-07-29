import React from 'react';
import _ from 'lodash';

const KeyCode = {
    Ctr: 17,
    Shift: 16,
    Backspace: 8,
    Enter: 13,
    Esc: 27,
    Left: 37,
    Up: 38,
    Right: 39,
    Down: 40,
    Del: 46
};

const tooltipId = _.uniqueId();

const PARENTHESES = "parentheses";
const CONDITION = "condition";
const FIELD = "field";
const FIELDVALUE = "fieldvalue";
const KEYWORD = "keyword";
const SPACE = "space";
const UNKNOWN = "unknown";


const defaultColor = "#000000";
const StringFieldColor = "#2196F3";
const NumberFieldColor = "#673AB7";
const ConditionColor = "#795548";
const keywordColor = "#ff8500";
const valueColor = "#6bb359";
const wrongColor = "#D50000";

const fields = [{
    name: 'src_ip',
    type: 'string'
}, {
    name: 'src_port',
    type: 'number'
}, {
    name: 'dst_ip',
    type: 'string'
}, {
    name: 'dst_port',
    type: 'number'
}];

export default class SuperHQLEditor extends React.Component {
    constructor(props) {
        super(props);

        this.codeRef = React.createRef();
        this.cursorRef = React.createRef();

        this.state = {
            editorState: '',
            x: 0,
            y: 0,
        };

        this.hightLightInstance = new hightLight([
            {
                type: PARENTHESES,
                group: [{
                    filters: [],
                    color: "#000000",
                }],
            }, {
                type: FIELD,
                group: [
                    {
                        filters: _.filter(fields, field => field.type === 'string').map(field => field.name),
                        color: "#2196F3"
                    },
                    {
                        filters: _.filter(fields, field => field.type === 'number').map(field => field.name),
                        color: "#673AB7"
                    }
                ],
            },
            {
                type: CONDITION,
                group: [{
                    filters: [],
                    color: "#795548",
                }],
            }, {
                type: FIELDVALUE,
                group: [{
                    filters: [],
                    color: "#6bb359",
                }],
            }, {
                type: KEYWORD,
                group: [{
                    filters: ['and', 'or', 'not'],
                    color: "#ff8500",
                }],
            }
        ]);
        this.tooltipInstance = null;

        this.handleKeyDown = this.handleKeyDown.bind(this);
        this.handleKeyUp = this.handleKeyUp.bind(this);
        this.handleMouseDown = this.handleMouseDown.bind(this);
        this.handlePaste = this.handlePaste.bind(this);
        this.defaultX = 0;
        this.defaultY = 0;
    }

    componentDidMount() {
        let code = this.codeRef.current;
        this.defaultX = code.offsetLeft;
        this.defaultY = code.offsetTop;

        this.tooltipInstance = new tooltip(code.parentElement, fields, (position) => {
            let content = this.codeRef.current;
            if (content) {
                this.setState({
                    editorState: content.textContent.replace(/\u200B/g,''),
                    x: position && position.x || this.defaultX,
                    y: position && position.y || this.defaultY,
                });
            }
        });
    }

    componentDidUpdate() {
        let taret = this.codeRef.current;
        this.hightLightInstance.update(taret);
        this.tooltipInstance.update({
            x: this.state.x,
            y: this.state.y,
        });
    }

    componentWillUnmount() {
        this.tooltipInstance.destroy();
    }

    handleMouseDown(event) {
        let cursor = this.cursorRef.current;
        let content = this.codeRef.current;
        let selection = document.getSelection();
        let position = getCursor(selection, selection.focusNode, selection.focusOffset);
        this.setState({
            x: position && position.x || this.defaultX,
            y: position && position.y || this.defaultY,
        });
    }

    handleKeyDown(event) {


    }

    handleKeyUp(event) {
        let current = this.codeRef.current;
        let selection = document.getSelection();
        let isEmpty = this.state.editorState.length === 0;
        let position;
        switch (event.keyCode) {
            case KeyCode.Ctr:
            case KeyCode.Shift:
                break;
            case KeyCode.Backspace:
            case KeyCode.Del:
                if (!isEmpty) {
                    resetSelection(selection, current, '');
                    position = getCursor(selection, selection.focusNode, selection.focusOffset);
                    this.setState({
                        editorState: current.textContent.replace(/\u200B/g,''),
                        x: position && position.x || this.defaultX,
                        y: position && position.y || this.defaultY,
                    });
                }
                break;
            default:
                if (isEmpty) {
                    dealWithEmpty(selection, current, event.key);
                } else {
                    resetSelection(selection, current, event.key);
                }
                position = getCursor(selection, selection.focusNode, selection.focusOffset);

                this.setState({
                    editorState: current.textContent.replace(/\u200B/g,''),
                    x: position && position.x || this.defaultX,
                    y: position && position.y || this.defaultY,
                });
                break;
        }
    }

    handlePaste(event) {
        let current = this.codeRef.current;
        let clipboardData = event.clipboardData
        let copyText = clipboardData.getData("text");
        if (copyText.length > 0) {
            let position;
            let selection = document.getSelection();
            if (this.state.editorState.length === 0) {
                dealWithEmpty(selection, current, copyText);
            } else {
                resetSelection(selection, current, copyText)
            }
            position = getCursor(selection, selection.focusNode, selection.focusOffset);

            this.setState({
                editorState: current.textContent.replace(/\u200B/g,''),
                x: position && position.x || this.defaultX,
                y: position && position.y || this.defaultY,
            });
        }
    }

    render() {

        return (
            <div
                className="code-container"
                tabIndex={-1}
                onKeyDown={this.handleKeyDown}
                onKeyUp={this.handleKeyUp}
                onClick={this.handleMouseDown}
                onPaste={this.handlePaste}
            >
                <div className="code-content">
                    <span ref={this.codeRef}>&#8203;</span>
                </div>
                <div ref={this.cursorRef} style={{ left: this.state.x + "px", top: this.state.y + "px" }} className="code-cursor"></div>
            </div>
        );
    }
}

function dealWithEmpty(selection, container, text) {
    let result = parser(text);
    function append(node) {
        return function (item) {
            let span = document.createElement('span');
            span.dataset['type'] = item.type;
            span.textContent = item.value;
            node.appendChild(span);
        }
    }
    result.forEach(append(container));
    let lastTextNode = container.lastElementChild.firstChild;
    let pos = lastTextNode.textContent.length;
    select(selection, lastTextNode, pos, lastTextNode, pos);
}

function parser(str) {
    str = str.replace(/\u00a0/g, " ");
    let metaData = [];
    for (let i = 0; i < str.length;) {
        let j = i;
        while (j < str.length && str[j] == ' ') {
            ++j;
        }
        switch (str[j]) {
            case '(':
            case ')':
                ++j;
                metaData.push({
                    type: PARENTHESES,
                    value: str.slice(i, j),
                    start: i,
                    end: j,
                });
                break;
            case '=':
                ++j;
                metaData.push({
                    type: CONDITION,
                    value: str.slice(i, j),
                    start: i,
                    end: j,
                });
                break;
            case '>':
            case '<':
                if (++j < str.length && str[j] === '=')++j;
                metaData.push({
                    type: CONDITION,
                    value: str.slice(i, j),
                    start: i,
                    end: j,
                });
                break;
            default:
                while (j < str.length && !/[()<=>\s]/.test(str[j])) {
                    ++j;
                }
                let value = str.slice(i, j);
                metaData.push({
                    type: getType(value.trim()),
                    value: value,
                    start: i,
                    end: j,
                });
                break;
        }
        i = j;
    }

    return metaData;
}

function getType(str) {
    switch (str) {
        case 'and':
        case 'or':
        case 'not':
            return KEYWORD;
        default:
            if (str[0] === '"' || /^\d+(\.\d*)?$/.test(str)) {
                return FIELDVALUE;
            } else {
                return FIELD;
            }
    }
}

function resetSelection(selection, container, str) {
    let focusNode = selection.focusNode;
    let anchorNode = selection.anchorNode;
    let start;
    let end;
    let startOffset;
    let endOffset;
    let isSameNode = anchorNode === focusNode;
    if (!isSameNode) {
        let nextElementSibling = focusNode.parentElement.nextElementSibling;
        if (nextElementSibling && selection.containsNode(nextElementSibling.firstChild)) {
            start = focusNode;
            end = anchorNode;
            startOffset = selection.focusOffset;
            endOffset = selection.anchorOffset;
        } else {
            start = anchorNode;
            end = focusNode;
            startOffset = selection.anchorOffset;
            endOffset = selection.focusOffset;
        }
    } else {
        start = anchorNode;
        end = focusNode;
        startOffset = Math.min(selection.focusOffset, selection.anchorOffset);
        endOffset = Math.max(selection.focusOffset, selection.anchorOffset);
        if (str.length === 0 && selection.isCollapsed)--startOffset;
    }
    let text = start.textContent.slice(0, startOffset) + str + end.textContent.slice(endOffset);
    let sElem = start.parentElement;
    let lElem = end.parentElement;
    while (lElem && lElem !== sElem) {
        let tmp = lElem.previousElementSibling;
        container.removeChild(lElem);
        lElem = tmp;
    }
    let result = parser(text);
    if (result.length === 0) {
        let parentElement = start.parentElement;
        let previousElementSibling = parentElement.previousElementSibling;
        container.removeChild(parentElement);
        if (previousElementSibling) {
            let textNode = previousElementSibling.firstChild;
            let pos = textNode.textContent.length;
            select(selection, textNode, pos, textNode, pos);
        } else {
            select(selection, container.firstChild, 1, container.firstChild, 1);
        }
    } else {
        let elem = start.parentElement;
        elem.dataset['type'] = result[0].type;
        elem.textContent = result[0].value;
        let elements = [elem];
        for (let i = 1; i < result.length; ++i) {
            let item = document.createElement('span');
            item.dataset['type'] = result[i].type;
            item.textContent = result[i].value;
            elem.insertAdjacentElement('afterend', item);
            elem = item;
            elements.push(elem);
        }
        startOffset += str.length;
        let index = _.findIndex(result, item => startOffset >= item.start && startOffset <= item.end);
        let target = elements[index];
        let pos = startOffset - result[index].start;
        select(selection, target.firstChild, pos, target.firstChild, pos);
    }
}

function getCursor(selection, target, pos) {
    let range = document.createRange();
    let element = target.parentElement;
    range.setStart(target, pos);
    range.setEnd(target, pos);
    let marked = document.createElement('span');
    range.surroundContents(marked);
    let left = marked.offsetLeft;
    let top = marked.offsetTop;
    marked.parentElement.removeChild(marked);
    range.detach();
    range = null;
    element.normalize();
    selection.extend(element.firstChild, pos);

    return {
        x: left,
        y: top,
    };
}

function select(selection, start, startOffset, end, endOffset) {
    let range = document.createRange();
    range.setStart(start, startOffset);
    range.setEnd(end, endOffset);
    selection.removeAllRanges();
    selection.addRange(range);
    range.detach();
    range = null;
}

function hightLight(config, defaultColor, wrongColor) {
    this.defaultColor = defaultColor || "#000000";
    this.wrongColor = wrongColor || "#D50000";
    this.metaData = {};
    this.initialize(config);
}

hightLight.prototype.update = function (elem) {
    if (!elem) return;
    let elements = elem.children;
    for (let i = 0; i < elements.length; ++i) {
        this.changeStyle(elements[i]);
    }
}

hightLight.prototype.changeStyle = function (elem) {
    let type = elem.dataset['type'];
    let word = elem.textContent.trim();
    let data = this.metaData[type];
    let color;
    if (data && data.group && data.group.length > 0) {
        let group = _.find(data.group, item => item.filters.length === 0 || _.indexOf(item.filters, word) !== -1);
        if (group) {
            color = group.color;
        } else {
            color = this.wrongColor;
        }
    } else {
        color = this.defaultColor;
    }
    elem.style.color = color;
}

hightLight.prototype.initialize = function (config) {
    for (let i = 0; i < config.length; ++i) {
        let curr = config[i];
        if (!this.metaData[curr.type]) {
            this.metaData[curr.type] = {};
        }
        let item = this.metaData[curr.type];
        if (!item.group) item.group = [];
        _.forEach(curr.group, g => {
            item.group.push({
                filters: g.filters,
                color: g.color,
            });
        });
    }
}

function tooltip(mount, fields, pick) {
    this.mount = mount;
    this.modal = null;
    this.fields = fields;
    this.isExpand = false;
    this.matches = [];
    this.focusNode = null;
    function callback(event) {
        event.preventDefault();
        event.stopPropagation();
        let content = this.modal.firstElementChild;
        let target = event.target;
        while (target.className !== "tooltip-item") {
            target = target.parentElement;
        }
        let index = parseInt(target.dataset['index']);
        let field = this.matches[index];
        if (this.focusNode) {
            let selection = document.getSelection();
            let focusNode = this.focusNode;
            let text = focusNode.textContent;
            let matches = text.match(/^\s*|\s*$/g);
            text = matches[0] + field.name;
            let startOffset = text.length;
            text += matches[1];
            focusNode.textContent = text;
            select(selection, focusNode.firstChild, startOffset, focusNode.firstChild, startOffset);
            this.hide();
            pick(getCursor(selection, focusNode.firstChild, startOffset));
        }
    }
    this.callback = callback.bind(this);
    this.initialize();
}

tooltip.prototype.destroy = function () {
    let content = this.modal.firstElementChild;
    content.removeEventListener('click', this.callback);
    this.modal.parentElement.removeChild(this.modal);
}

tooltip.prototype.initialize = function () {
    tooltip = document.createElement('div');
    tooltip.id = tooltipId;
    tooltip.className = "editor-tooltip";
    tooltip.style.display = "none";
    tooltip.innerHTML = `<ul class=\"tooltip-content\" />`;
    this.mount.appendChild(tooltip);
    this.modal = tooltip;
    this.register();
}

tooltip.prototype.update = function (position) {
    let selection = document.getSelection();
    if (selection.isCollapsed) {
        let focusNode = selection.focusNode;
        if (focusNode.nodeType === 3) focusNode = focusNode.parentElement;
        let type = focusNode.dataset['type'];
        if (type === FIELD) {
            this.focusNode = focusNode;
            let fieldName = focusNode.textContent.trim();
            if (fieldName.length === 0) return;
            let matches = _.filter(this.fields, field => fieldName.length < field.name.length && field.name.indexOf(fieldName) !== -1) || [];
            if (matches.length > 0) {
                this.modal.style.left = position.x + "px";
                this.modal.style.top = position.y + "px";
                this.matches = matches;
                this.generate();
                this.show();
            } else {
                this.matches = [];
                this.hide();
            }
        } else {
            this.hide();
        }
    } else {
        this.hide();
    }
}

tooltip.prototype.show = function () {
    if (!this.isExpand) {
        this.modal.style.display = "block";
        this.isExpand = true;
    }
}

tooltip.prototype.hide = function () {
    if (this.isExpand) {
        this.modal.style.display = "none";
        this.isExpand = false;
    }
}

tooltip.prototype.generate = function () {
    let html = "";
    for (let i = 0; i < this.matches.length; ++i) {
        let item = this.matches[i];
        html += `<li class="tooltip-item" data-index=${i}>
        <div className="tooltip-title">${item.name}</div>
        <p className="tooltip-description">${item.description}</p>
    </li>`
    }

    this.modal.firstElementChild.innerHTML = html;
}

tooltip.prototype.register = function () {
    let content = this.modal.firstElementChild;
    content.addEventListener('click', this.callback);
}