import React from 'react';
import _ from 'lodash';
import "./index.scss";

const defaultColor = "#000000";
const StringFieldColor = "#2196F3";
const NumberFieldColor = "#673AB7";
const ConditionColor = "#795548";
const keywordColor = "#ff8500";
const valueColor = "#6bb359";
const wrongColor = "#D50000";

export default class HQLEditor extends React.Component {
    constructor(props) {
        super(props);

        this.state = {
            value: "",
        }
        this.editorRef = React.createRef();
        this.handleInput = this.handleInput.bind(this);
    }

    componentDidUpdate() {
        this.applyStyle();
        this.adjustCursor();
    }

    adjustCursor() {
        let selection = document.getSelection();
        selection.removeAllRanges();
        let range = document.createRange();
        let editor=this.editorRef.current;
        range.selectNodeContents(editor);
        selection.addRange(range);
        selection.collapseToEnd();
        range.detach();
    }

    applyStyle() {
        if (this.state.value.length > 0) {
            let range = document.createRange();
            let editorElement = this.editorRef.current;
            let statistics = parseStr(this.state.value);
            for (let i = statistics.length - 1; i >= 0; --i) {
                applyStyle(statistics[i], editorElement, range);
            }
            range.detach();
        }
    }

    handleInput(event) {
        let editor = this.editorRef.current;
        let value = editor.textContent.replace(/\u00a0/g, " ");
        this.setState({
            key: _.uniqueId('richText'),
            value: value,
        });
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
            </div>
        );
    }
}

const PARENTHESES = "parentheses";
const CONDITION = "condition";
const FIELD = "field";
const FIELDVALUE = "fieldvalue";
const KEYWORD = "keyword";
const SPACE = "space";
const SYNTAXERROR = "syntaxerror";
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