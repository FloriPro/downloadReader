class debugColorEditor {
    constructor() {
        document.querySelector("#debugColorEditor").style.display = "";
        this.style();
        this.loadOptions();
        this.genStyle();

        setTimeout(this.initClasses, 500)
    }

    initClasses() {
        //for body class list
        for (var i = 0; i < document.body.classList.length; i++) {
            var className = document.body.classList[i];
            if (className.includes("color")) {
                document.body.classList.remove(className);
            }
        }

        document.body.classList.add("typeXcolor");
    }

    style() {
        var style = document.createElement('style');
        style.innerHTML = `
        #debugColorEditor {
            position: fixed;
            top: 0px;
            left: 0px;
            max-width: 500px;
            max-height: 500px;

            background-color: black;
            z-index: 1000000;
        }
        
        #debugColorEditor * {
            color: white;
            background-color: black;
        }
        `

        document.head.appendChild(style);

        this.extraStyle = document.createElement('style');
        document.head.appendChild(this.extraStyle);
    }
    loadOptions() {
        var select = document.querySelector("#debugColorEditorSelect");

        this.optionsdict = {
            ".typeXcolor": {
                "color": "#1e1d25",
                "background-color": "#ffffff"
            },
            ".typeXcolor button.selected": {
                "background-color": "#d6d6d6 !important"
            },
            ".typeXcolor .styleColorUpdate, button, button:hover, a": {
                "background-color": "#ffffff",
                "color": "#1e1d25",
            },
            ".typeXcolor .downloadedPage": {
                "background-color": "#f2f2f2",
                "box-shadow": "0 0 10px #cccccc",
                "color": "black"
            },
            ".typeXcolor #editPanelMassDownloadLinksList .selected": {
                "background-color": "#00ff00"
            },
            ".typeXcolor #editPanelMassDownloadLinksList .notselected": {
                "background-color": "#ff5900"
            },
            ".typeXcolor #editPanelMassDownloadLinksList .clicked": {
                "background-color": "#00abff"
            },
            ".typeXcolor #selectWraper": {
                "background-color": "#ffffff",
                "border": "1px solid #cccccc",
            },
            ".typeXcolor #loading": {
                "background-color": "#fffff"
            },
            ".typeXcolor .lds-ellipsis div": {
                "background-color": "#000000"
            },
            ".typeXcolor .minimalDownloadedPageName": {
                "color": "#0000ff"
            },
            ".typeXcolor .minimalDownloadedPageUrl": {
                "color": "#cccccc"
            },
        };

        this.options = Object.keys(this.optionsdict);

        for (var i = 0; i < this.options.length; i++) {
            var option = this.options[i];
            var optionElement = document.createElement("option");
            optionElement.value = option;
            optionElement.innerHTML = option;
            select.appendChild(optionElement);
        }

        select.addEventListener("change", this.updateSelect.bind(this));
        this.updateSelect();
    }

    updateSelect() {
        var select = document.querySelector("#debugColorEditorSelect");
        var option = select.value;
        var optionStyle = this.optionsdict[option];

        var style = document.querySelector("#debugColorEditorStyle");
        style.innerHTML = "";

        for (var i = 0; i < Object.keys(optionStyle).length; i++) {
            var key = Object.keys(optionStyle)[i];
            var value = optionStyle[key];

            var valueEdit = value.replace("!important", "");
            valueEdit = valueEdit.replace(" ", "");

            var div = document.createElement("div");
            div.innerHTML = key + ": <input type='color' value='" + valueEdit + "' data-key='" + key + "' data-option='" + option + "' data-originalvalue='" + value + "'>";
            style.appendChild(div);
        }

        var inputs = document.querySelectorAll("#debugColorEditorStyle input");
        for (var i = 0; i < inputs.length; i++) {
            var input = inputs[i];
            input.addEventListener("change", this.updateStyle.bind(this));
            input.addEventListener("input", this.updateStyle.bind(this));
        }
    }

    updateStyle(e) {
        var input = e.target;
        var key = input.dataset.key;
        var option = input.dataset.option;
        var value = input.value;
        var originalValue = input.dataset.originalvalue;


        var parsedValue = originalValue;
        //replace #...... with new value
        parsedValue = parsedValue.replace(/#[0-9a-fA-F]{6}/g, value);

        var optionStyle = this.optionsdict[option];
        optionStyle[key] = parsedValue;

        this.genStyle();
    }

    genStyle() {
        var style = "";

        for (var i = 0; i < this.options.length; i++) {
            var option = this.options[i];
            var optionStyle = this.optionsdict[option]
            var thisopt = "";
            for (var j = 0; j < Object.keys(optionStyle).length; j++) {
                var key = Object.keys(optionStyle)[j];
                var value = optionStyle[key];
                thisopt += key + ":" + value + ";";
            }
            style += option + "{" + thisopt + "}";
        }

        this.extraStyle.innerHTML = style;
    }
}


window.addEventListener('load', (event) => {
    if (window.colorEditor == true) {
        colorEditor = new debugColorEditor();
    }
});