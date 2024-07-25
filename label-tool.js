function getUrlParam(name) {
    let pram = new URLSearchParams(location.search);
    return pram.get(name);
}

function formDataToJson(formDom) {
    let json = {};
    $.each(formDom.serializeArray(), function (index, item) {
        json[item.name.toString()] = item.value.toString();
    })
    return json;
}

function getCurrentLabelCnt() {
    let count = 1;
    while (true) {
        if (document.getElementById(`code-form-${count}`) == null) {
            return count - 1;
        }
        count += 1;
    }
}

function initPage() {
    if (localStorage.getItem('username') === null) {
        layui.use('layer', function(){
            const layer = layui.layer;
            layer.prompt({
                formType: 0,
                value: '',
                title: '请输入用户名（记录进度用）',
            }, function(value, index){
                localStorage.setItem('username', value);
                layer.close(index);
                loadPage('keep');
            });
        });
    } else {
        loadPage('keep');
    }
}

function getDatasetName() {
    return getUrlParam('dataset') !== null ? getUrlParam('dataset') : 'HumanEval';
}

function loadPage(type, index=null) {
    let loadIndex = layer.load(1);
    fetch("http://62.234.188.176:80", {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: (JSON.stringify({
            'action': 'load',
            'dataset': getDatasetName(),
            'user': localStorage.getItem('username'),
            'type': type,
            'index': index,
        }))
    })
        .then(response => {
            if (!response.ok && response.status !== 500) {
                throw new Error(response.status.toString());
            }
            return response.json();
        })
        .then(data => {
            if ('error' in data) {
                throw new Error(data['error']);
            }
            load(data);
            hljs.initHighlightingOnLoad();
            hljs.initLineNumbersOnLoad();
            if (type === 'keep') {
                //console.log($('#dataset'))
                $("#dataset").find("option").each(function(){
                    if(this.value === getDatasetName()){
                        $(this).attr("selected",true);
                    }
                });
            }
            bindListeners(type);
            setTips();
            layui.form.render();
            layui.form.render(null, 'prompt-form');
            layer.close(loadIndex);
        })
        .catch(error => {
            layer.close(loadIndex);
            layer.alert(error.toString(), {icon: 2, title: '错误'});
            if (error.toString().includes('bad value of username')) {
                localStorage.removeItem('username');
            }
        });
}

function save() {
    let saveIndex = layer.load(1);
    layui.form.render();
    let codeLabels = [];
    for (let i = 1; i <= getCurrentLabelCnt(); i++) {
        codeLabels.push(formDataToJson($(`#code-form-${i}`)));
    }
    const labels = {
        'prompt': formDataToJson($('#prompt-form')),
        'code': codeLabels
    };
    console.log(labels)
    const saveReq = () => {
        fetch("http://62.234.188.176:80", {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: (JSON.stringify({
                'action': 'save',
                'dataset': getDatasetName(),
                'user': localStorage.getItem('username'),
                'id': $('#task-id')['0'].innerText,
                'labels': labels
            }))
        })
            .then(response => {
                if (!response.ok && response.status !== 500) {
                    throw new Error(response.status.toString());
                }
                layer.close(saveIndex);
                return response.json();
            })
            .then(data => {
                if ('error' in data) {
                    throw new Error(data['error']);
                }
                layer.msg("保存成功！", {icon: 1, time: 800});
                setTimeout(() => location.reload(),800);
            })
            .catch(error => {
                layer.alert(error.toString(), {icon: 2, title: '错误'});
            });
    }
    if ($('#eval-result')['0'].innerHTML === 'FAIL' &&
        (codeLabels.length === 0 || isEmpty(codeLabels))) {
        layer.confirm('该代码未通过测试用例，确认无幻觉吗？', {
            btn: ['确认', '取消'],
            yes: function () {saveReq()},
            btn2: function (index) {
                layer.close(index);
                layer.close(saveIndex);
            },
            icon: 0,
            title: '请再次验证'
        });
    } else {
        saveReq();
    }
}

function isEmpty(labels) {
    for (let label of labels) {
        for (let [_, value] of Object.entries(label)) {
            if (value !== '') {
                return false;
            }
        }
    }
    return true;
}

function wrapCode(content, plaintext=false) {
    let wrapped = "";
    for (let line of content.toString().split('\n')) {
        wrapped += ` ${line}\n`;
    }
    if (plaintext) {
        return `<pre><code class="language-plaintext">${wrapped}</code></pre>`;
    } else {
        return `<pre><code style="background: #1c1c1c">${wrapped}</code></pre>`;
    }
}

function packageLabelHtml(index) {
    let html = `
    <form class="layui-form" id="code-form-${index}" style="margin-bottom: 30px" autocomplete="off">
        <div class="layui-form-item">
            <div class="layui-col-md1" style="display: flex; justify-content: center; margin-top: 20px">
                <div class="layui-form-mid layui-word-aux">${index}</div>
            </div>`;
    for (let type of ['start', 'end']) {
        html += `
            <div class="layui-col-md1" style="margin-top: 20px">
                <div class="layui-row">
                    <div class="layui-input-inline" style="width: 80px">
                        <label>
                            <input name="${type}-lineno" id="${type}-lineno-${index}" type="text" class="layui-input">
                        </label>
                    </div>
                </div>
                <div id="${type}-lineno-warning-${index}" class="layui-row" style="font-size:x-small; color: red;">
                    * 数据不符合范围！
                </div>
            </div>`;
    }
    html += `
            <div class="layui-col-md3">
                <div class="layui-input-inline" style="width: 325px">`;
    for (let factor of [['Prompt相关', ['P1', 'P2', 'P3', 'P4']], ['模型相关', ['M1', 'M2']]]) {
        html += `
                    <div class="layui-row">
                        <div class="layui-form-mid" style="font-size: x-small; width: 58px; text-align: right">${factor[0]}</div>`;
        for (let factorId of factor[1]) {
            html += `
                        <span id="${factorId}-${index}">
                            <input type="checkbox" name="factor-${factorId}" title="${factorId}" value="${factorId}" lay-skin="primary">
                        </span>`;
        }
        html += `
                    </div>`;
    }
    html += `
                    <div class="layui-row">
                        <div class="layui-form-mid" style="font-size: x-small; width: 58px; text-align: right">其它</div>
                        <label>
                            <input type="text" id="factor-other-${index}" name="factor-other" class="layui-input" placeholder="请注明" style="width: 235px">
                        </label>
                    </div>
                </div>
            </div>
            <div class="layui-col-md4" id="hallucination-type-${index}">
                <div class="layui-input-inline" style="width: 480px">`;
    for (let type of [['需求冲突', ['R1', 'R21', 'R22', 'R23']], ['知识冲突', ['K1', 'K2', 'K31', 'K32', 'K33']], ['代码一致性冲突', ['C1', 'C2', 'C3', 'C4', 'other']]]) {
        html += `
                    <div class="layui-row">
                        <div class="layui-form-mid" style="font-size: x-small; width: 70px; text-align: right">${type[0]}</div>`;
        for (let typeId of type[1]) {
            html += `
                        <span id="${typeId}-${index}">
                            <input type="radio" name="hallucination-type" title="${typeId}" value="${typeId}">
                        </span>`;
        }
        html += `
                    </div>`;
    }
    html += `
                    <div class="layui-row">
                        <div id="type-other-all-${index}">
                            <div class="layui-form-mid" style="font-size: x-small; width: 70px; text-align: right">其它</div>
                            <label>
                                <input type="text" id="type-other-${index}" name="hallucination-type-other" class="layui-input" placeholder="请注明" style="width: 340px">
                            </label>
                        </div>
                        <label>
                            <input type="text" id="conflict-content-${index}" name="conflict-content" class="layui-input" placeholder="请给出冲突的prompt内容/变量/库" style="width: 340px; margin-left: 80px; margin-top: 6px">
                        </label>
                    </div>
                </div>
            </div>
            <div class="layui-col-md2">
                <div class="layui-input-inline" style="padding-left: 20px">`;
    for (let line of [['A1', 'A2', 'A3'], ['A4', 'A5']]) {
        html += `
                    <div class="layui-row">`;
        for (let affectionId of line) {
            html += `
                        <span id="${affectionId}-${index}">
                            <input type="checkbox" name="affection-${affectionId}" title="${affectionId}" value="${affectionId}" lay-skin="primary">
                        </span>`;
        }
        html += `
                    </div>`;
    }
    html += `
                    <div class="layui-row">
                        <label>
                            <input type="text" id="affection-other-${index}" name="affection-other" class="layui-input" placeholder="其它，请注明" style="width: 200px; margin-top: 6px">
                        </label>
                    </div>
                    <div class="layui-row">
                        <label>
                            <input type="text" id="trigger-testcase-${index}" name="trigger-testcase" class="layui-input" placeholder="请给出trigger testcase" style="width: 200px; margin-top: 6px">
                        </label>
                    </div>
                </div>
            </div>
        </div>
    </form>`;
    return html;
}


function load(data) {
    console.log(data)
    let labels = data['labels'];
    data = data['data'];
    let dataset = data['dataset'];

    $('#task-id')['0'].innerText = data['_id'];

    let percentage = `${Math.round(eval(data['schedule']) * 100)}%`
    $('#progress-detail')['0'].innerText = `${data['schedule']} (${percentage})`;
    layui.use('element', function() {
        layui.element.progress('progress-bar', percentage);
    });

    let existLabeler = $('#exist-labeler');
    if (data['exist_labeler'].length > 0) {
        existLabeler['0'].innerText = data['exist_labeler'];
        existLabeler.css('display', '');
    } else {
        existLabeler.css('display', 'none');
    }
    let evalResult = $('#eval-result')
    let passed, evalInfo;
    if (dataset === 'HumanEval') {
        passed = data['evaluation_result'] === 'passed';
        evalInfo = data['evaluation_result'];
    } else {
        passed = data['evaluation_result']['is_pass'];
        if (dataset === 'CEJava') {
            evalInfo = data['evaluation_result']['error_detail_message'];
        } else {
            evalInfo = ''
        }
    }
    if (passed) {
        evalResult['0'].innerText = 'PASS';
        evalResult.css('color', 'limegreen');
    } else {
        evalResult['0'].innerText = 'FAIL';
        evalResult.css('color', 'red');
    }
    $('#index')['0'].innerText = data['index']

    $('#prompt')['0'].innerHTML = wrapCode(data['prompt']);
    $('#reference')['0'].innerHTML = wrapCode(data['reference_solution']);
    $('#result')['0'].innerHTML = wrapCode(evalInfo);
    $('#generation')['0'].innerHTML = wrapCode(data['raw_generation']);
    $('#code')['0'].innerHTML = wrapCode(data['generation']);

    let promptLabelIcon = $('#prompt-label-icon')
    let codeLabelIcon = $('#code-label-icon')

    if (Object.keys(labels).length > 0) {
        let promptLabel = labels['prompt'];
        let codeLabels = labels['code'];

        promptLabelIcon['0'].innerHTML = '&#x1005';
        promptLabelIcon.css('color', 'limegreen');
        $('#logic-complexity').attr('value', promptLabel['logic-complexity']);
        if (promptLabel['fuzzy'] !== undefined) {
            $('#fuzzy')['0'].firstElementChild.setAttribute('checked', '');
            $('#fuzzy-content-input')['0'].innerText = promptLabel['fuzzy-content'];
        } else {
            $('#fuzzy')['0'].firstElementChild.removeAttribute('checked');
            $('#fuzzy-content-input')['0'].innerText = '';
        }
        if (promptLabel['incomplete'] !== undefined) {
            $('#incomplete')['0'].firstElementChild.setAttribute('checked', '');
        } else {
            $('#incomplete')['0'].firstElementChild.removeAttribute('checked');
        }
        if (codeLabels !== null) {
            codeLabelIcon['0'].innerHTML = '&#x1005';
            codeLabelIcon.css('color', 'limegreen');
            let labelsHTML = "";
            for (let index = 1; index <= codeLabels.length; index++) {
                labelsHTML += packageLabelHtml(index);
            }
            $('#code-form-all')['0'].innerHTML = labelsHTML;
            $.each(codeLabels, function (idx, item) {
                let index = idx + 1;
                $(`#start-lineno-${index}`).attr('value', item['start-lineno']);
                $(`#end-lineno-${index}`).attr('value', item['end-lineno']);
                for (let factor of item['factors']) {
                    if (factor in id2desc) {
                        $(`#${factor}-${index}`)['0'].firstElementChild.setAttribute('checked', '');
                    } else {
                        $(`#factor-other-${index}`).attr('value', factor);
                    }
                }
                let hallucinationType = item['hallucination-type'];
                $(`#${hallucinationType}-${index}`)['0'].firstElementChild.setAttribute('checked', '');
                if (hallucinationType === 'other') {
                    $(`#type-other-${index}`).attr('value', item['hallucination-type-other']);
                } else if (['R1', 'C1', 'C4'].includes(hallucinationType)) {
                    $(`#conflict-content-${index}`).attr('value', item['conflict-content'])
                }
                for (let affection of item['affections']) {
                    if (affection in id2desc) {
                        $(`#${affection}-${index}`)['0'].firstElementChild.setAttribute('checked', '');
                        if (affection === 'A1') {
                            $(`#trigger-testcase-${index}`).attr('value', item['trigger-testcase']);
                        }
                    } else {
                        $(`#affection-other-${index}`).attr('value', affection);
                    }
                }
            });
        } else {
            codeLabelIcon['0'].innerHTML = '&#xe642';
            codeLabelIcon.css('color', 'yellow');
            $('#code-form-all')['0'].innerHTML = packageLabelHtml(1);
        }
    } else {
        promptLabelIcon['0'].innerHTML = '&#xe642';
        promptLabelIcon.css('color', 'yellow');
        $('#logic-complexity').attr('value', '');
        $('#fuzzy')['0'].firstElementChild.removeAttribute('checked');
        $('#fuzzy-content-input')['0'].innerText = '';
        $('#incomplete')['0'].firstElementChild.removeAttribute('checked');
        codeLabelIcon['0'].innerHTML = '&#xe642';
        codeLabelIcon.css('color', 'yellow');
        $('#code-form-all')['0'].innerHTML = packageLabelHtml(1);
    }
    // window.scrollTo(0, 100);
    // document.getElementById("logic-complexity").focus();
    // const ipt = document.getElementById("logic-complexity");
    // const len = ipt.value.length;
    // if (ipt && ipt.setSelectionRange) {
    //     ipt.setSelectionRange(len, len);
    // }
}


id2desc = {
    'P1': '复杂逻辑',
    'P2': '过长',
    'P3': '模糊/歧义',
    'P4': '不完整',
    'M1': '逻辑能力',
    'M2': '知识储备',
    'R1': '功能性需求冲突（代码的的某一部分（或全部）与prompt的某个关键词/语句之间存在直接的语义冲突，并且影响了代码的功能正确性',
    'R21': '时间复杂度需求冲突',
    'R22': '空间复杂度需求冲突',
    'R23': '代码风格需求冲突',
    'C1': '对未定义变量的引用',
    'C2': '结果未被后续代码使用的语句/代码片段',
    'C3': '代码前后逻辑割裂',
    'C4': '代码前后使用不一致的工具库（需具体给出）',
    'K1': '生活常识（e.g. 闰年的计算）',
    'K2': '数学与自然科学知识',
    'K31': '算法知识（算法的原理和实现）',
    'K32': '代码库知识（包括标准库和广泛使用的第三方库）',
    'K33': '计算机理论知识（e.g. 反码与补码）',
    'A1': '功能',
    'A2': '执行效率',
    'A3': '内存占用',
    'A4': '可读性',
    'A5': '可维护性和可扩展性',
}


function setTips() {
    let spans = document.getElementsByTagName('span')
    $.each(spans, function (index, span) {
        let child = span.firstElementChild;
        let id;
        if (child != null && child.tagName.toLowerCase() === 'input') {
            id = child.getAttribute('title');
            if (id in id2desc) {
                span.setAttribute('title', id2desc[id]);
            }
        }
    })
}


document.addEventListener("keyup", function(event) {
    if (event.shiftKey) {
        switch (event.code) {
            case 'ArrowLeft': {
                loadPage('prev');
                break;
            }
            case 'ArrowUp': {
                // document.getElementById("line-0").focus();
                // const ipt = document.getElementById("line-0");
                // const len = ipt.value.length;
                // ipt.setSelectionRange(len, len);
                window.scrollTo(100, 0);
                break;
            }
            case 'ArrowRight': {
                loadPage('next');
                break;
            }
            case 'ArrowDown': {
                save();
                break;
            }
        }
    }
});

layui.use(['form'], function(){
    const form = layui.form;
    form.on('select(dataset)', function(data){
        const currentURL = window.location.href;
        window.location.href = `${currentURL.split('?')[0]}?dataset=${data.value}`;
    });
});

function bindListeners(type, index=1) {
    let complexityWarningHandler = function () {
        let promptForm = formDataToJson($('#prompt-form'));
        if (['', '1', '2', '3', '4', '5'].includes(promptForm['logic-complexity'])) {
            $('#complexity-warning').css('display', 'none');
        } else {
            $('#complexity-warning').css('display', '');
        }
    };
    let fuzzyContentDisplayHandler = function () {
        let promptForm = formDataToJson($('#prompt-form'));
        console.log(promptForm)
        if (promptForm['fuzzy'] === undefined) {
            $('#fuzzy-content').css('display', 'none');
        } else {
            $('#fuzzy-content').css('display', '');
        }
    }
    let addButtonHandler = function () {
        let cnt = getCurrentLabelCnt();
        $('#code-form-all')['0'].innerHTML += packageLabelHtml(cnt + 1);
        bindListeners('add');
        layui.form.render();
    }
    let linenoWarningHandler = function (index, type) {
        let codeForm = formDataToJson($(`#code-form-${index}`));
        let lineno = Number(codeForm[`${type}-lineno`]);
        if ((isNaN(lineno) || lineno <= 0) && codeForm[`${type}-lineno`] !== '') {
            $(`#${type}-lineno-warning-${index}`).css('display', '');
        } else {
            $(`#${type}-lineno-warning-${index}`).css('display', 'none');
        }
    }
    let typeOtherContentHandler = function (index) {
        let codeForm = formDataToJson($(`#code-form-${index}`));
        if (codeForm['hallucination-type'] === 'other') {
            $(`#type-other-all-${index}`).css('display', '');
        } else {
            $(`#type-other-all-${index}`).css('display', 'none');
        }
    }
    let conflictContentHandler = function (index) {
        let codeForm = formDataToJson($(`#code-form-${index}`));
        if (['R1', 'C1', 'C4'].includes(codeForm['hallucination-type'])) {
            $(`#conflict-content-${index}`).css('display', '');
        } else {
            $(`#conflict-content-${index}`).css('display', 'none');
        }
    }
    let affectionTriggerTestcaseHandler = function (index) {
        let codeForm = formDataToJson($(`#code-form-${index}`));
        console.log(codeForm)
        if (codeForm['affection-A1'] === undefined || $('#eval-result')['0'].innerText === 'FAIL') {
            $(`#trigger-testcase-${index}`).css('display', 'none');
        } else {
            $(`#trigger-testcase-${index}`).css('display', '');
        }
    }

    if (index === 1) {
        if (type === 'keep') {
            $('#prev-button')['0'].addEventListener('click', function () {loadPage('prev')});
            $('#next-button')['0'].addEventListener('click', function () {loadPage('next')});
            $('#save-button')['0'].addEventListener('click', function () {save()});
            $('#jump-button')['0'].addEventListener('click', function () {loadPage('jump', formDataToJson($('#search-form'))['index']);})
            $('#logic-complexity')['0'].addEventListener('input', complexityWarningHandler);
            $('#fuzzy')['0'].addEventListener('click', fuzzyContentDisplayHandler);
            $('#add-button')['0'].addEventListener('click', addButtonHandler);
        }
        complexityWarningHandler();
        fuzzyContentDisplayHandler();
    }

    for (let i = index; i <= getCurrentLabelCnt(); i++) {
        // factorOtherContentHandler(i);
        linenoWarningHandler(i, 'start');
        linenoWarningHandler(i, 'end');
        typeOtherContentHandler(i);
        conflictContentHandler(i);
        affectionTriggerTestcaseHandler(i);
        // $(`#factor-other-${i}`)['0'].addEventListener('click', function () {factorOtherContentHandler(i)});
        $(`#start-lineno-${i}`)['0'].addEventListener('input', function () {linenoWarningHandler(i, 'start')});
        $(`#end-lineno-${i}`)['0'].addEventListener('input', function () {linenoWarningHandler(i, 'end')});
        let hallucinationTypePadDom = $(`#hallucination-type-${i}`);
        hallucinationTypePadDom['0'].addEventListener('click', function () {typeOtherContentHandler(i)});
        hallucinationTypePadDom['0'].addEventListener('click', function () {conflictContentHandler(i)});
        $(`#A1-${i}`)['0'].addEventListener('click', function () {affectionTriggerTestcaseHandler(i)});
    }
}
