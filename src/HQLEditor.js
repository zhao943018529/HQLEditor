import React from 'react';
import _ from 'lodash';

import Tooltip from './Tooltip';
import "./index.scss";

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

const PARENTHESES = "parentheses";
const CONDITION = "condition";
const FIELD = "field";
const FIELDVALUE = "fieldvalue";
const KEYWORD = "keyword";
const SPACE = "space";
const SYNTAXERROR = "syntaxerror";

export default class HQLEditor extends React.Component {
    constructor(props) {
        super(props);

        this.state = {
            value: "",
            tips:[],
        }
        this.editorRef = React.createRef();
        this.handleInput = this.handleInput.bind(this);
        this.pickTip = this.pickTip.bind(this);
        // this.recordPosition = this.recordPosition.bind(this);
        this.parseData=null;

        this.clientX=0;
        this.clientY=0;
    }

    componentDidMount() {
        this.recordPosition();
    }

    componentDidUpdate() {
        this.applyStyle();
        this.adjustCursor();
        this.recordPosition();
    }

    adjustCursor() {
        let selection = document.getSelection();
        selection.removeAllRanges();
        let range = document.createRange();
        let editor = this.editorRef.current;
        range.selectNodeContents(editor);
        selection.addRange(range);
        selection.collapseToEnd();
        range.detach();
    }

    applyStyle() {
        let parseData = this.parseData;
        if (parseData.length > 0) {
            let range = document.createRange();
            let editorElement = this.editorRef.current;
            for (let i = parseData.length - 1; i >= 0; --i) {
                applyStyle(parseData[i], editorElement, range);
            }
            range.detach();
        }
    }

    handleInput(event) {
        let editor = this.editorRef.current;
        let value = editor.textContent.replace(/\u00a0/g, " ");
        let parseData = parseStr(value);
        let tips = [];
        if (parseData.length > 0) {
            let last = parseData[parseData.length - 1];
            if (last.type === FIELD && last.end === value.length - 1) {
                tips = _.filter(fields, field => last.value.length < field.name.length && field.name.indexOf(last.value) !== -1);
            }
        }
        this.parseData=parseData;

        this.setState({
            value: value,
            tips: tips,
        });
    }

    pickTip(item) {
        let parseData = this.parseData;
        if (parseData.length > 0) {
            let last = parseData[parseData.length - 1];
            let value = this.state.value;
            let name = item.name;
            if (last.type === FIELD && last.end == value.length - 1) {
                value = value.substring(0, last.start) + name;
                last.end = value.length - 1;
                last.value = name;
                last.color = item.type === "number" ? NumberFieldColor : StringFieldColor;
                this.setState({
                    value: value,
                    tips: [],
                });
            }
        }
    }

    recordPosition(event) {
        let editor = this.editorRef.current;
        let child = editor.lastElementChild;
        let rect;
        if (child) {
            rect = child.getBoundingClientRect();
            this.clientY = rect.top + rect.height;
        } else {
            rect = editor.getBoundingClientRect();
            this.clientY = rect.top + 24;
        }
        this.clientX = rect.left;
    }

    render() {

        return (
            <div className="container">
                <div
                    className="richEditor"
                    contentEditable={true}
                    onInput={this.handleInput}
                    ref={this.editorRef}
                >
                    {this.state.value}
                </div>
                {this.state.tips.length > 0 ? <Tooltip options={this.state.tips} pickTip={this.pickTip} left={this.clientX} top={this.clientY}/> : undefined}
            </div>
        );
    }
}

function getFieldByName(name) {
    return _.find(fields, function (item) {
        return item.name === name;
    });
}

/*
*[{type:'condition',start:10,end:14,value:'<='}]
*
*/
function parseStr(str) {
    let statistics = [];
    let stack = [];//{}
    for (let i = 0; i < str.length;) {
        let j = i + 1;
        let color;
        switch (str[i]) {
            case ' ':
                while (j < str.length && str[j] === ' ') {
                    ++j;
                }
                break;
            case '(':
                statistics.push({
                    type: PARENTHESES,
                    start: i,
                    end: i,
                    value: '(',
                    color: defaultColor,
                });
                stack.push(i);
                break;
            case ')':
                color = defaultColor;
                if (stack.length == 0) {
                    color = wrongColor;
                } else {
                    stack.pop();
                }
                statistics.push({
                    type: PARENTHESES,
                    start: i,
                    end: i,
                    value: ')',
                    color: color,
                });
                break;
            default:
                let word;
                if (statistics.length === 0) {
                    while (j < str.length && str[j] != ' ' && str[j] != '=' && str[j] != '<' && str[j] != '>') {
                        ++j;
                    }
                    word = str.substr(i, j - i);
                    let field = getFieldByName(word);
                    if (field) {
                        color = field.type === 'number' ? NumberFieldColor : StringFieldColor;
                    } else {
                        color = wrongColor;
                    }
                    statistics.push({
                        type: FIELD,
                        start: i,
                        end: j - 1,
                        value: word,
                        color: color,
                    });
                } else {
                    let preSta = statistics[statistics.length - 1];
                    switch (preSta.type) {
                        case PARENTHESES:
                            if (preSta.value === '(') {
                                while (j < str.length && str[j] != ' ' && str[j] != '=' && str[j] != '<' && str[j] != '>') {
                                    ++j;
                                }
                                word = str.substr(i, j - i);
                                let type;
                                if (word === 'not') {
                                    type = KEYWORD;
                                    color = keywordColor;
                                } else {
                                    let field = getFieldByName(word);
                                    type = FIELD;
                                    if (field) {
                                        color = field.type === 'number' ? NumberFieldColor : StringFieldColor;
                                    } else {
                                        color = wrongColor;
                                    }
                                }
                                statistics.push({
                                    type: type,
                                    start: i,
                                    end: j - 1,
                                    value: word,
                                    color: color,
                                });
                            } else {
                                while (j < str.length && str[j] != ' ' && str[j] != '(') {
                                    ++j;
                                }
                                word = str.substr(i, j - i);
                                if (word != 'and' && word != 'or') {
                                    color = wrongColor;
                                } else {
                                    color = keywordColor;
                                }
                                statistics.push({
                                    type: KEYWORD,
                                    start: i,
                                    end: j - 1,
                                    value: word,
                                    color: color,
                                });
                            }
                            break;
                        case KEYWORD:
                            while (j < str.length && str[j] != ' ' && str[j] != '=' && str[j] != '<' && str[j] != '>') {
                                ++j;
                            }
                            word = str.substr(i, j - i);
                            let field = getFieldByName(word);
                            if (field) {
                                color = field.type === 'number' ? NumberFieldColor : StringFieldColor;
                            } else {
                                color = wrongColor;
                            }
                            statistics.push({
                                type: FIELD,
                                start: i,
                                end: j - 1,
                                value: word,
                                color: color,
                            });
                            break;
                        case CONDITION:
                            if (str[i] == '"') {
                                while (j < str.length && str[j] != '"') {
                                    ++j;
                                }
                                if (str[j] == '"')++j;
                            } else {
                                while (j < str.length && /\d/.test(str[j])) {
                                    ++j;
                                }
                            }
                            word = str.substr(i, j - i);
                            statistics.push({
                                type: FIELDVALUE,
                                start: i,
                                end: j - 1,
                                value: word,
                                color: valueColor,
                            });
                            break;
                        case FIELD:
                            while (j < str.length && /[><=]/.test(str[j])) {
                                ++j;
                            }
                            word = str.substr(i, j - i);
                            statistics.push({
                                type: CONDITION,
                                start: i,
                                end: j - 1,
                                value: word,
                                color: ConditionColor,
                            });
                            break;
                        case FIELDVALUE:
                            while (j < str.length && str[j] != ' ' && str[j] != '(') {
                                ++j;
                            }
                            word = str.substr(i, j - i);
                            statistics.push({
                                type: KEYWORD,
                                start: i,
                                end: j - 1,
                                value: word,
                                color: (word == "and" || word == "or") ? keywordColor : wrongColor,
                            });
                            break;
                        default:
                            break;
                    }
                }
                break;
        }
        i = j;
    }

    for (let i = 0; i < stack.length; ++i) {
        let statistic = _.find(statistics, item => item.start === stack[i]);
        statistic.color = wrongColor;
    }

    return statistics;
}

function applyStyle(statistic, element, range) {
    let textNode = element.childNodes[0];
    range.setStart(textNode, statistic.start);
    range.setEnd(textNode, statistic.end + 1);
    let styleEle = document.createElement('span');
    styleEle.style.color = statistic.color;
    range.surroundContents(styleEle);
}