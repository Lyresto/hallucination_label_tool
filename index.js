let cnt = 0;

function initPage() {
    cnt = 0;
    $.ajax({
        url: "code-servlet",
        type: "get",
        dataType: "json",
        data: {"action": "initLoad"},
        success: function (data) {
            load(data);
        }
    });
}

function changeTask(next) {
    cnt = 0;
    $.ajax({
        url: "code-servlet",
        type: "get",
        dataType: "json",
        data: {"action": "load", "next": next},
        success: function (data) {
            load(data);
        }
    });
}

function add() {
    document.getElementById("halls").innerHTML +=
        "<div class=\"layui-form-item\">\n" +
        "                <div class=\"layui-input-inline\" style=\"margin-left: 20px\">\n" +
        "                    <label>\n" +
        "                        <input id=\"line-" + cnt + "\" type=\"text\" name=\"line-" + cnt + "\" autocomplete=\"off\" class=\"layui-input\">\n" +
        "                    </label>\n" +
        "                </div>\n" +
        "                <div class=\"layui-input-inline\" style=\"margin-left: 20px\">\n" +
        "                    <div>\n" +
        "                        <input name=\"type-" + cnt + "\" value=\"Intrinsic\" type=\"radio\">内部\n" +
        "                        <input name=\"type-" + cnt + "\" value=\"Extrinsic\" type=\"radio\">外部\n" +
        "                        <input name=\"type-" + cnt + "\" value=\"Uncertain\" type=\"radio\">不确定\n" +
        "                    </div>\n" +
        "                </div>\n" +
        "                <div>\n" +
        "                    <button onclick='highLight(this)' type=\"button\" class=\"layui-upload-button layui-btn-sm layui-bg-gray\" style=\"display:none; margin-left: 20px\" match-id=" + index + ">\n" +
        "                        高亮\n" +
        "                    </button>\n" +
        "                </div>\n" +
        "            </div>";
    cnt++;
    layui.form.render();
}

function highLight(dom) {
    let id = dom.getAttribute("match-id");
    let line = document.getElementById("line-" + id).value.toString().split("-");
    let start = parseInt(line[0]) - 1;
    let end = parseInt(line[1]) - 1;
    let lines = document.getElementById("code").getElementsByTagName("span");
    for (let i = 0; i < lines.length; i++) {
        lines[i].style.color = '#dedede';
    }
    for (let i = start; i <= end; i++) {
        lines[i].style.color = 'red';
    }
    layui.use(function(){
        layui.code({
            elem: '.code',
            skin: 'dark'
        });
    })
}

function save() {
    layui.form.render();
    const param = $.param({'action': "save"}) + '&' +
        $.param({'cnt': cnt}) + '&' +
        $('#Hallucinated-Contents-form').serialize();
    console.log(param)
    $.ajax({
        url: "code-servlet",
        type: "get",
        dataType: "json",
        data: param,
        success: function (data) {
            if (data["success"] === true) {
                layer.msg("保存成功！", {icon: 1});
                setTimeout(() => location.reload(),400);
            }
        }
    });
}

function load(data) {
    document.getElementById("task-id").innerHTML = data["task-id"];
    document.getElementById("index").innerHTML = data["index"];
    console.log(data);
    let mpt = "";
    for (let i in data["prompt"].toString().split("\n")) {
        let line = data["prompt"].toString().split("\n")[i];
        line = line.replaceAll(" ", "&nbsp")
        mpt += "<span>" + line + "</span>\n";
    }
    document.getElementById("prompt").innerHTML = mpt
    let code = "";
    for (let i in data["code"].toString().split("\n")) {
        let line = data["code"].toString().split("\n")[i];
        line = line.replaceAll(" ", "&nbsp")
        code += "<span>" + line + "</span>\n";
    }
    document.getElementById("code").innerHTML = code
    let ref = "";
    if ("reference" in data) {
        for (let i in data["reference"].toString().split("\n")) {
            let line = data["reference"].toString().split("\n")[i];
            line = line.replaceAll(" ", "&nbsp")
            ref += "<span>" + line + "</span>\n";
        }
    }
    document.getElementById("reference").innerHTML = ref;
    let halls = ""
    if ("halls" in data) {
        let index = 0;
        for (let i in data["halls"]) {
            cnt++;
            const hall = data["halls"][i];
            let inner = "";
            let outer = "";
            let un = "";
            if (hall["type"] === "Intrinsic") {
                inner = "checked";
            }
            else if (hall["type"] === "Extrinsic") {
                outer = "checked";
            }
            else {
                un = "checked";
            }
            halls += "<div class=\"layui-form-item\">\n" +
                "                <div class=\"layui-input-inline\" style=\"margin-left: 20px\">\n" +
                "                    <label>\n" +
                "                        <input id=\"line-" + index + "\" type=\"text\" name=\"line-" + index + "\" value=\"" + hall["line"] + "\" autocomplete=\"off\" class=\"layui-input\">\n" +
                "                    </label>\n" +
                "                </div>\n" +
                "                <div class=\"layui-input-inline\" style=\"margin-left: 20px\">\n" +
                "                    <div>\n" +
                "                        <input name=\"type-" + index + "\" value=\"Intrinsic\" type=\"radio\" " + inner + ">内部\n" +
                "                        <input name=\"type-" + index + "\" value=\"Extrinsic\" type=\"radio\" " + outer + ">外部\n" +
                "                        <input name=\"type-" + index + "\" value=\"Uncertain\" type=\"radio\" " + un + ">不确定\n" +
                "                    </div>\n" +
                "                </div>\n" +
                "                <div>\n" +
                "                    <button onclick='highLight(this)' type=\"button\" class=\"layui-upload-button layui-btn-sm layui-bg-gray\" style=\"display:none; margin-left: 20px\" match-id=" + index + ">\n" +
                "                        高亮\n" +
                "                    </button>\n" +
                "                </div>\n" +
                "            </div>";
            index++;
        }
    }
    else {
        cnt = 1;
        halls = "<div class=\"layui-form-item\">\n" +
            "                <div class=\"layui-input-inline\" style=\"margin-left: 20px\">\n" +
            "                    <label>\n" +
            "                        <input id=\"line-0\" type=\"text\" name=\"line-0\" autocomplete=\"off\" class=\"layui-input\">\n" +
            "                    </label>\n" +
            "                </div>\n" +
            "                <div class=\"layui-input-inline\" style=\"margin-left: 20px\">\n" +
            "                    <div>\n" +
            "                        <input name=\"type-0\" value=\"Intrinsic\" type=\"radio\">内部\n" +
            "                        <input name=\"type-0\" value=\"Extrinsic\" type=\"radio\">外部\n" +
            "                        <input name=\"type-0\" value=\"Uncertain\" type=\"radio\">不确定\n" +
            "                    </div>\n" +
            "                </div>\n" +
            "                <div>\n" +
            "                    <button type=\"button\" match-id=0 class=\"layui-upload-button layui-btn-sm layui-bg-gray\" style=\"margin-left: 20px; display: none\">\n" +
            "                        高亮\n" +
            "                    </button>\n" +
            "                </div>\n" +
            "            </div>";
    }
    document.getElementById("halls").innerHTML = halls;
    console.log(cnt)
    layui.form.render();
    layui.use(function(){
        layui.code({
            elem: '.code',
            skin: 'dark'
        });
    })
    layui.use(function(){
        layui.code({
            elem: '.prompt',
            skin: 'dark'
        });
    })
    document.getElementById("line-0").focus();
    const ipt = document.getElementById("line-0");
    const len = ipt.value.length;
    ipt.setSelectionRange(len, len);
    window.scrollTo(100, 0)
}

function search() {
    const param = $.param({'action': "search"}) + '&' +
        $('#search-form').serialize();
    $.ajax({
        url: "code-servlet",
        type: "get",
        dataType: "json",
        data: param,
        success: function (data) {
            load(data);
        }
    });
}


document.addEventListener("keyup", key)

function key (event) {
    console.log(event.keyCode)
    switch (event.keyCode) {
        case 37: {
            changeTask(false);
            break;
        }
        case 38: {
            document.getElementById("line-0").focus();
            const ipt = document.getElementById("line-0");
            const len = ipt.value.length;
            ipt.setSelectionRange(len, len);
            window.scrollTo(100, 0);
            break;
        }
        case 39: {
            changeTask(true);
            break;
        }
        case 40: {
            save();
            break;
        }
    }
}