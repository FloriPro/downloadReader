class gui {
    constructor() {
        this.pageReader = new pageReader();
        this.loader = new loader();
        document.querySelector('#btnDownload').addEventListener('click', this.buttonAddUrl);
        document.querySelector('#btnToggleUrlGroup').addEventListener('click', this.toggleUrlGroup.bind(this));
        this.minimalMode = false;
        document.querySelector('#btnMinimalMode').addEventListener('click', this.toggleMinimalMode.bind(this));
        this.updatePages();

        this.currentTab = "Home";
        this.tab = {
            "Home": {
                "id": "home",
            },
            "Page": {
                "id": "page",
            }
        };
        this.showTab(this.currentTab);
        this.currentPage = null;
        this.loadDisplayTypes();
    }

    async toggleMinimalMode() {
        this.minimalMode = await CONTROLLER.database.getOption("minimalMode");
        this.minimalMode = !this.minimalMode;
        CONTROLLER.database.setOption("minimalMode", this.minimalMode);
        this.updatePages();
    }

    async toggleUrlGroup() {
        let urlGroup = await CONTROLLER.database.getOption("pagedTree");
        urlGroup = !urlGroup;
        CONTROLLER.database.setOption("pagedTree", urlGroup);
        this.updatePages();
    }

    setUrlGrupText(urlGroup) {
        if (urlGroup) {
            document.querySelector('#btnToggleUrlGroup').innerText = "Disable URL Group";
        } else {
            document.querySelector('#btnToggleUrlGroup').innerText = "Enable URL Group";
        }
    }


    async loadDisplayTypes() {
        this.pageDisplayTypes = {
            Margin: {
                "Type 1": "type1container",
                "Type 2": "type2container",
                "Type 3": "type3container",
            },
            Color: {
                "Light": "type1color",
                "Dark": "type2color",
                "Dark Dark": "type23color",
                "Mid Dark": "type3color",
                "Solarized Dark": "solarizedDarkColor",
                "Atomic Dark": "atomicDarkColor",
            },
            Font: {
                "Serif": "type1font",
                "Sans-Serif": "type2font",
                "Monospace": "type3font",
            },
            Size: {
                "Extra Small": "type0size",
                "Small": "type1size",
                "Medium Small": "type12size",
                "Medium": "type2size",
                "Medium Large": "type23size",
                "Large": "type3size",
                "Extra Large": "type4size"
            }
        }
        this.pageDisplayTypesStandard = {
            Margin: "Type 1",
            Color: "Mid Dark",
            Font: "Sans-Serif",
            Size: "Medium",
        }

        if (await CONTROLLER.database.optionExists("pageDisplayTypes")) {
            this.pageDisplayTypesStandard = await CONTROLLER.database.getOption("pageDisplayTypes");
        } else {
            await CONTROLLER.database.setOption("pageDisplayTypes", this.pageDisplayTypesStandard);
        }

        this.specialTypeCode = {
            Color: (type, type2) => {
                //set meta theme-color tag
                var meta = document.querySelector('meta[name="theme-color"]');
                var colors = {
                    "Light": "#ffffff",
                    "Dark": "#000000",
                    "Dark Dark": "#000000",
                    "Mid Dark": "#5a5151",
                    "Solarized Dark": "#002b36",
                    "Atomic Dark": "1d1f21"
                }
                meta.setAttribute("content", colors[type2]);
            }
        }
        this.reversePageDisplayTypes = {}
        this.pageDisplayTypesDom = {}
        this.pageDisplayTypesSelected = {}
        this.addPageDisplayTypes();
    }

    buttonAddUrl() {
        var url = prompt('Enter URL', '');
        if (!url) {
            return;
        }
        CONTROLLER.getPage(url);
    }
    async updatePages() {
        this.minimalMode = await CONTROLLER.database.getOption("minimalMode");
        if (this.minimalMode == undefined || this.minimalMode == null) {
            this.minimalMode = false;
        }
        const id = this.loader.add();

        let urlGroup = await CONTROLLER.database.getOption("pagedTree");
        if (urlGroup == null) {
            urlGroup = false;
            CONTROLLER.database.setOption("pagedTree", urlGroup);
        }
        this.setUrlGrupText(urlGroup);
        const p = await CONTROLLER.database.getPages();
        const div = document.querySelector('#downloadedPages');
        div.innerHTML = '';

        if (!urlGroup) {
            for (let i = 0; i < p.length; i++) {
                div.appendChild(this.getPage(p[i].url));
            }
        }
        else {
            const t = this.loadPageTree(p);

            let urlGroupClosed = await CONTROLLER.database.getOption("pagedTreeClosed");
            if (urlGroupClosed == null) {
                urlGroupClosed = this.resetUrlGroupClosed(t);
                //urlGroupClosed = {};
                CONTROLLER.database.setOption("pagedTreeClosed", urlGroupClosed);
            }

            for (var x of Object.keys(t)) {
                let pt = this.displayPageTree(t[x]["me"], t[x]["children"], urlGroupClosed[x], x, urlGroupClosed);
                div.appendChild(pt);
            }
        }
        this.loader.remove(id);
    }

    resetUrlGroupClosed(t) {
        let urlGroupClosed = {};
        for (var x of Object.keys(t)) {
            urlGroupClosed[x] = {
                "closed": false,
                "children": this.resetUrlGroupClosed(t[x]["children"]),
            }
        }
        return urlGroupClosed;
    }

    displayPageTree(me, children, urlGroupClosed, myurl, outerGroupClosed) {
        let div = this.getPage(me.url);

        let wrapper = document.createElement('div');
        wrapper.classList.add("pageTreeWrapper");

        let ul = document.createElement('ul');
        ul.classList.add('pageTreeUl');

        for (var x of Object.keys(children)) {
            let li = this.displayPageTree(children[x]["me"], children[x]["children"], urlGroupClosed["children"][x], x, outerGroupClosed);
            ul.appendChild(li);
        }
        wrapper.appendChild(ul);

        if (Object.keys(children).length != 0) {
            let closeBtn = document.createElement('button');
            closeBtn.classList.add('pageTreeCloseBtn');
            closeBtn.innerText = "X";
            closeBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                ul.classList.toggle('pageTreeWrapperClosed');
                urlGroupClosed["closed"] = ul.classList.contains('pageTreeWrapperClosed');
                CONTROLLER.database.setOption("pagedTreeClosed", outerGroupClosed);
                if (ul.classList.contains('pageTreeWrapperClosed')) {
                    closeBtn.innerText = ">";
                } else {
                    closeBtn.innerText = "X";
                }
            });
            if (urlGroupClosed["closed"]) {
                ul.classList.add('pageTreeWrapperClosed');
                closeBtn.innerText = ">";
            }
            wrapper.appendChild(closeBtn);
        }

        div.appendChild(wrapper);
        return div;
    }

    loadPageTree(p) {
        let out = {};
        let minLen = 1000000;

        for (let i = 0; i < p.length; i++) {
            let url = this.parseUrl(p[i].url);
            let urlSplit = url.split('/');
            let len = urlSplit.length;
            if (len < minLen) {
                minLen = len;
            }
        }

        //only add pages with the minimum length
        for (let i = 0; i < p.length; i++) {
            let url = this.parseUrl(p[i].url);
            let urlSplit = url.split('/');
            let len = urlSplit.length;
            if (len == minLen) {
                //start url until min /
                let startUrl = urlSplit.slice(0, len).join('/');
                out[startUrl] = {
                    me: p[i],
                    children: {}
                };

                //get other urls that start with startUrl
                let urls = [];
                for (let j = 0; j < p.length; j++) {
                    let url2 = this.parseUrl(p[j].url);
                    if (url2.startsWith(startUrl) && url2 != startUrl) {
                        urls.push(p[j]);
                    }
                }
                out[startUrl]["children"] = this.loadPageTree(urls);
            }
        }
        return out;
    }

    parseUrl(url) {
        //https://www.example.com/path/to/page.html
        //return www.example.com/path/to/page.html (remove http(s)://
        let nu = url.replace(/(^\w+:|^)\/\//, '');
        if (nu.endsWith('/')) {
            nu = nu.slice(0, -1);
        }
        return nu;
    }

    getMinimalPage(url) {
        let div = document.createElement('div');
        div.classList.add('minimalDownloadedPage');

        let infoWrapper = document.createElement('div');
        infoWrapper.classList.add('minimalDownloadedPageInfoWrapper');
        div.appendChild(infoWrapper);

        let pName = document.createElement('p');
        pName.classList.add('minimalDownloadedPageName');
        pName.innerText = "Loading...";
        pName.onclick = this.pageClick.bind(this, url);
        CONTROLLER.database.getPage(url).then((page) => {
            if (!page) {
                return;
            }
            if (page.title == "") {
                page.title = url;
            }
            pName.innerText = page.title;
        });
        infoWrapper.appendChild(pName);

        let pUrl = document.createElement('p');
        pUrl.classList.add('minimalDownloadedPageUrl');
        pUrl.innerText = url;
        infoWrapper.appendChild(pUrl);

        let redownloadButton = document.createElement('button');
        redownloadButton.classList.add('minimalRedownload');
        redownloadButton.innerText = 'Redownload';
        redownloadButton.onclick = this.redownloadPage.bind(this, url);
        infoWrapper.appendChild(redownloadButton);

        let deleteButton = document.createElement('button');
        deleteButton.classList.add('minimalDelete');
        deleteButton.innerText = 'Delete';
        deleteButton.onclick = this.deletePage.bind(this, url);
        infoWrapper.appendChild(deleteButton);

        return div;
    }

    getPage(url) {
        //if minimal mode is on
        if (this.minimalMode) {
            return this.getMinimalPage(url);
        }

        const div = document.createElement('div');
        div.classList.add('downloadedPage');
        div.onclick = this.pageClick.bind(this, url);

        const pUrl = document.createElement('p');
        pUrl.innerText = url;
        pUrl.style.overflowWrap = "anywhere";
        div.appendChild(pUrl);

        const redownloadButton = document.createElement('button');
        redownloadButton.classList.add('redownload');
        redownloadButton.innerText = 'Redownload';
        redownloadButton.onclick = this.redownloadPage.bind(this, url);
        div.appendChild(redownloadButton);

        const deleteButton = document.createElement('button');
        deleteButton.classList.add('delete');
        deleteButton.innerText = 'Delete';
        deleteButton.onclick = this.deletePage.bind(this, url);
        div.appendChild(deleteButton);

        CONTROLLER.database.getPage(url).then(dbInfo => {
            if (!dbInfo) {
                return;
            }

            let pTitle = document.createElement('p');
            pTitle.classList.add('title');
            pTitle.innerText = dbInfo.title;
            div.prepend(pTitle);

            pUrl.style.fontSize = '0.8em';
        });


        return div;
    }
    pageClick(url) {
        event.stopPropagation();
        CONTROLLER.showPage(url);
    }

    redownloadPage(url) {
        CONTROLLER.getPage(url);
        event.stopPropagation();
    }

    deletePage(url) {
        CONTROLLER.database.deletePage(url);
        this.updatePages();
        event.stopPropagation();
    }

    showTab(tab) {
        this.currentTab = tab;
        for (var t in this.tab) {
            if (t == tab) {
                document.querySelector('#' + this.tab[t].id).style.display = 'block';
            } else {
                document.querySelector('#' + this.tab[t].id).style.display = 'none';
            }
        }

        if (tab != "Page") {
            this.currentPage = null;
        }
    }

    addPageDisplayTypes() {
        var div = document.querySelector("#autoGenDisplayTypes");
        for (var t in this.pageDisplayTypes) {
            let containerWrapper = document.createElement('div');
            containerWrapper.classList.add('displayTypeSelectContainer');

            let container = document.createElement('div');
            let p = document.createElement('p');
            p.innerText = t + ':';
            p.style.margin = '0';
            containerWrapper.appendChild(p);
            container.classList.add('displayTypeSelectRow');

            this.pageDisplayTypesSelected[t] = Object.values(this.pageDisplayTypes[t])[0];
            this.pageDisplayTypesDom[t] = { container: container, items: {} }
            this.reversePageDisplayTypes[t] = {}
            for (var t2 in this.pageDisplayTypes[t]) {
                var btn = document.createElement('button');
                btn.innerText = t2;
                btn.onclick = this.setPageDisplayType.bind(this, t, t2);
                container.appendChild(btn);
                this.pageDisplayTypesDom[t].items[t2] = btn;
                this.reversePageDisplayTypes[t][this.pageDisplayTypes[t][t2]] = t2;
            }
            this.setPageDisplayType(t, this.pageDisplayTypesStandard[t]);
            containerWrapper.appendChild(container);
            div.appendChild(containerWrapper);
        }
    }

    setPageDisplayType(type, type2) {
        var old = this.pageDisplayTypesSelected[type];
        if (this.pageDisplayTypesDom[type].items[this.reversePageDisplayTypes[type][old]]) {
            this.pageDisplayTypesDom[type].items[this.reversePageDisplayTypes[type][old]].classList.remove('selected');
        } else {
            console.log('no old');
        }

        this.pageDisplayTypesSelected[type] = this.pageDisplayTypes[type][type2];
        this.pageDisplayTypesDom[type].items[type2].classList.add('selected');
        document.querySelector("body").classList.remove(old);
        document.querySelector("body").classList.add(this.pageDisplayTypesSelected[type]);
        if (this.specialTypeCode[type]) {
            this.specialTypeCode[type](type, type2);
        }

        var selectedFullNames = {}
        for (var t in this.pageDisplayTypesSelected) {
            selectedFullNames[t] = this.reversePageDisplayTypes[t][this.pageDisplayTypesSelected[t]];
        }
        CONTROLLER.database.setOption("pageDisplayTypes", selectedFullNames);
    }

    showPage(url, content, title, options) {
        this.showTab("Page");
        document.querySelector('#pageUrl').innerText = url;
        document.querySelector('#pageContentBody').innerHTML = CONTROLLER.reader.applyOptions(content, options);
        document.querySelector('#pageContentTitle').innerText = title;

        this.currentPage = url;
    }

    openSelect(data) {
        /*
        data = {
            title: "Page options",
            options: [
                {
                    text: "Open in browser",
                    action: () => {
                        window.open(url, '_blank');
                    }
                },
                {
                    text: "Download page",
                    action: () => {
                        CONTROLLER.getPage(url);
                    }
                },
                {
                    text: "Download and open page",
                    action: () => {
                        CONTROLLER.getPage(url);
                        CONTROLLER.showPage(url);
                    }
                }
            ]
        }
        */
        //selectTitle
        //selectOptions

        var div = document.querySelector('#select');
        div.style.display = 'flex';

        var title = document.querySelector('#selectTitle');
        title.innerText = data.title;

        var options = document.querySelector('#selectOptions');
        options.innerHTML = '';
        for (var i = 0; i < data.options.length; i++) {
            var btn = document.createElement('button');
            btn.innerText = data.options[i].text;
            btn.onclick = ((action, div) => {
                action();
                div.style.display = 'none';
            }).bind(this, data.options[i].action, div);
            options.appendChild(btn);
        }

        var close = document.querySelector('#selectClose');
        close.onclick = (() => {
            div.style.display = 'none';
            options.innerHTML = '';
            if (data.onClose) {
                data.onClose();
            }
        }).bind(this);
    }

    async asyncSelect(title, options) {
        return new Promise((resolve, reject) => {

            var op = []
            for (var i = 0; i < options.length; i++) {
                var d = {
                    text: options[i],
                    action: ((i) => {
                        resolve(options[i]);
                    }).bind(this, i)
                }
                op.push(d);
            }

            this.openSelect({
                title: title,
                options: op,
                onClose: () => {
                    resolve(null);
                }
            });
        });
    }
}

/**
 * handles functions that make reading pages work
 */
class pageReader {
    constructor() {
        this.div = document.querySelector('#page');
        this.div.addEventListener('click', this.click.bind(this));

        this.optionsOpen = false;
        this.editPanelOpen = false;
        this.updateOptions();

        this.massDownloadStuff = new massDownloadStuff();
    }

    /**
     * 
     * @param {MouseEvent} event 
     */
    click(event) {
        //if #pageOptions is not clicked
        if (!event.composedPath().includes(document.querySelector('#pageOptions')) && !event.composedPath().includes(document.querySelector('#editPanel'))) {
            this.toggleOptions();
        }
    }

    toggleOptions() {
        this.optionsOpen = !this.optionsOpen;
        this.updateOptions();
    }

    updateOptions() {
        if (this.optionsOpen) {
            document.querySelector('#pageOptions').style.display = '';
        } else {
            document.querySelector('#pageOptions').style.display = 'none';
        }
    }

    edit() {
        this.editPanelOpen = !this.editPanelOpen;
        this.updateEditPanel();
    }

    updateEditPanel() {
        if (this.editPanelOpen) {
            document.querySelector('#editPanel').style.display = '';
            this.optionsOpen = false;
            this.updateOptions();
            this.makeEditPanel();
        } else {
            document.querySelector('#editPanel').style.display = 'none';
            CONTROLLER.reloadPage();
        }
        document.querySelector("#editPanelMassDownloadLinksLoad").style.display = '';
        document.querySelector("#editPanelMassDownloadLinksList").style.display = 'none';
        document.querySelector("#editPanelMassDownloadLinksApply").style.display = 'none';
        document.querySelector("#editPanelMassDownloadLinksCancel").style.display = 'none';
    }

    async makeEditPanel() {
        var data = await CONTROLLER.database.getPage(GUI.currentPage);

        this.removedTexts = [];
        if (data.options.removedTexts) {
            this.removedTexts = data.options.removedTexts;
        }
        this.replaceTexts = [];
        if (data.options.replaceTexts) {
            this.replaceTexts = data.options.replaceTexts;
        }
        var editPanelRemoveTextsList = document.querySelector('#editPanelRemoveTextsList');
        editPanelRemoveTextsList.innerHTML = '';
        for (var t of this.removedTexts) {
            var p = document.createElement('p');
            p.innerText = t;
            p.title = "click to remove";
            p.onclick = this.removeRemoveText.bind(this, t);
            editPanelRemoveTextsList.appendChild(p);
        }

        var editPanelReplaceTextsList = document.querySelector('#editPanelReplaceTextsList');
        editPanelReplaceTextsList.innerHTML = '';
        for (var t of this.replaceTexts) {
            var p = document.createElement('p');
            p.innerText = t["from"] + " -> " + t["to"];
            p.title = "click to remove";
            p.onclick = this.removeEditText.bind(this, t);
            editPanelReplaceTextsList.appendChild(p);
        }
    }

    addRemoveText() {
        var text = document.querySelector('#editPanelRemoveTextsInput').value;
        if (text && text != "" && text != " ") {
            this.removedTexts.push(text);
            CONTROLLER.database.setPageOption(GUI.currentPage, "removedTexts", this.removedTexts).then(() => {
                GUI.pageReader.makeEditPanel();
            });
        }
        document.querySelector('#editPanelRemoveTextsInput').value = "";
    }
    removeRemoveText(text) {
        this.removedTexts.splice(this.removedTexts.indexOf(text), 1);
        CONTROLLER.database.setPageOption(GUI.currentPage, "removedTexts", this.removedTexts).then(() => {
            GUI.pageReader.makeEditPanel();
        });
    }

    addReplaceText() {
        var text = document.querySelector('#editPanelReplaceTextsInput').value;
        var text2 = document.querySelector('#editPanelReplaceTextsInput2').value;
        if (text && text != "" && text != " " && text2 && text2 != "" && text2 != " ") {
            this.replaceTexts.push({ from: text, to: text2 });
            CONTROLLER.database.setPageOption(GUI.currentPage, "replaceTexts", this.replaceTexts).then(() => {
                GUI.pageReader.makeEditPanel();
            });
        }
        document.querySelector('#editPanelReplaceTextsInput').value = "";
        document.querySelector('#editPanelReplaceTextsInput2').value = "";
    }

    removeEditText(text) {
        this.replaceTexts.splice(this.replaceTexts.indexOf(text), 1);
        CONTROLLER.database.setPageOption(GUI.currentPage, "replaceTexts", this.replaceTexts).then(() => {
            GUI.pageReader.makeEditPanel();
        });
    }

    async loadMassDownloadLinks() {
        document.querySelector("#editPanelMassDownloadLinksApply").style.display = '';
        document.querySelector("#editPanelMassDownloadLinksCancel").style.display = '';
        document.querySelector("#editPanelMassDownloadLinksLoad").style.display = 'none';

        document.querySelector("#editPanelMassDownloadLinksList").style.display = "";
        document.querySelector("#editPanelMassDownloadLinksList").innerHTML = "";
        var data = await CONTROLLER.database.getPage(GUI.currentPage);

        var htmdiv = document.createElement("div");
        htmdiv.innerHTML = data.content;
        var links = htmdiv.querySelectorAll("a");

        var plinks = [];
        for (var link of links) {
            var p = document.createElement("p");
            p.innerText = link.innerText + " >> " + link.href;
            p.onclick = this.massDownloadStuff.click.bind(this.massDownloadStuff, p, link.href, link.innerText);
            document.querySelector("#editPanelMassDownloadLinksList").appendChild(p);
            plinks.push(link.href);
        }
        this.massDownloadStuff.setLinks(plinks);
    }

    applyMassDownloadLinks() {
        var links = this.massDownloadStuff.getLinks();
        this.cancelMassDownloadLinks();

        for (var link of links) {
            CONTROLLER.getPage(link);
        }
    }
    cancelMassDownloadLinks() {
        document.querySelector("#editPanelMassDownloadLinksApply").style.display = 'none';
        document.querySelector("#editPanelMassDownloadLinksCancel").style.display = 'none';
        document.querySelector("#editPanelMassDownloadLinksList").style.display = "none";
        document.querySelector("#editPanelMassDownloadLinksLoad").style.display = '';
    }
}

class massDownloadStuff {
    getLinks() {
        var links = [];
        for (var i = 0; i < this.links.length; i++) {
            if (this.selected[i] == "clicked" || this.selected[i]) {
                links.push(this.links[i]);
            }
        }
        return links;
    }
    setLinks(links) {
        this.clickeds = { start: -1, end: -1 };
        this.startClicked = false;
        this.endClicked = false;

        this.links = links;
        this.selected = [];
        for (var link of this.links) {
            this.selected.push(true);
        }
        this.updateSelected();
    }

    updateSelected() {
        for (var i = 0; i < this.links.length; i++) {
            if (this.selected[i] == "clicked") {
                document.querySelector("#editPanelMassDownloadLinksList").children[i].classList.add("clicked");
                document.querySelector("#editPanelMassDownloadLinksList").children[i].classList.remove("selected");
                document.querySelector("#editPanelMassDownloadLinksList").children[i].classList.remove("notselected");
            }
            else if (this.selected[i]) {
                //document.querySelector("#editPanelMassDownloadLinksList").children[i].style.backgroundColor = "green";
                document.querySelector("#editPanelMassDownloadLinksList").children[i].classList.remove("clicked");
                document.querySelector("#editPanelMassDownloadLinksList").children[i].classList.add("selected");
                document.querySelector("#editPanelMassDownloadLinksList").children[i].classList.remove("notselected");
            } else {
                //document.querySelector("#editPanelMassDownloadLinksList").children[i].style.backgroundColor = "red";
                document.querySelector("#editPanelMassDownloadLinksList").children[i].classList.remove("clicked");
                document.querySelector("#editPanelMassDownloadLinksList").children[i].classList.remove("selected");
                document.querySelector("#editPanelMassDownloadLinksList").children[i].classList.add("notselected");
            }
        }
    }

    updateSelection() {
        if (this.clickeds.start != -1 && this.clickeds.end != -1) {
            var start = Math.min(this.clickeds.start, this.clickeds.end);
            var end = Math.max(this.clickeds.start, this.clickeds.end);
            this.clickeds.start = start;
            this.clickeds.end = end;
            for (var i = 0; i < this.links.length; i++) {
                if (i >= start && i <= end) {
                    this.selected[i] = true;
                } else {
                    this.selected[i] = false;
                }
            }
            if (this.startClicked) {
                this.selected[this.clickeds.start] = "clicked";
            }
            if (this.endClicked) {
                this.selected[this.clickeds.end] = "clicked";
            }
            this.updateSelected();
        }
    }

    click(p, link, name) {
        if (this.clickeds.start == -1 && this.clickeds.end == -1) {
            this.clickeds.start = this.links.indexOf(link);
            this.clickeds.end = this.links.indexOf(link);
            this.updateSelection();
            return;
        }
        var clickid = this.links.indexOf(link);
        if (this.startClicked) {
            this.clickeds.start = clickid;
            this.startClicked = false;
            this.updateSelection();
            return;
        }
        if (this.endClicked) {
            this.clickeds.end = clickid;
            this.endClicked = false;
            this.updateSelection();
            return;
        }

        if (clickid < this.clickeds.start) {
            this.clickeds.start = clickid;
            this.updateSelection();
            return;
        }
        if (clickid > this.clickeds.end) {
            this.clickeds.end = clickid;
            this.updateSelection();
            return;
        }

        if (clickid == this.clickeds.start) {
            this.startClicked = true;
            this.updateSelection();
            return;
        }
        if (clickid == this.clickeds.end) {
            this.endClicked = true;
            this.updateSelection();
            return;
        }

        if (clickid > this.clickeds.start && clickid < this.clickeds.end) {
            this.selected[clickid] = !this.selected[clickid];
            this.updateSelected();
            return;
        }
    }
}

class loader {
    constructor() {
        this.div = document.querySelector('#loading');
        this.ids = {};
    }

    randomId() {
        var id = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
        while (this.ids[id]) {
            id = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
        }
        this.ids[id] = { active: true };
        return id;
    }

    add(message = null) {
        var id = this.randomId();
        if (message) {
            this.ids[id].message = message;
        }
        this.update();
        return id;
    }
    remove(id) {
        delete this.ids[id];
        this.update();
    }

    update() {
        if (Object.keys(this.ids).length > 0) {
            this.div.style.display = 'flex';

            var hasMessage = false;
            var messages = [];
            for (var id in this.ids) {
                if (this.ids[id].message) {
                    hasMessage = true;
                    messages.push(this.ids[id].message);
                }
            }
            if (!hasMessage) {
                document.querySelector("#loadingStandardInfo").style.display = 'block';
            } else {
                document.querySelector("#loadingStandardInfo").style.display = 'none';

                document.querySelector("#loadingMessages").innerHTML = '';
                for (var msg of messages) {
                    var p = document.createElement('p');
                    p.innerText = msg;
                    document.querySelector("#loadingMessages").appendChild(p);
                }
            }
        } else {
            this.div.style.display = 'none';
        }
    }
}

class api {
    constructor() {
        //this.url = 'http://localhost:3000/api/';
        this.url = "https://proxy.flulu.eu/"
    }
    #get(url, callback, error = null) {
        fetch(this.url + url)
            .then(response => response.json())
            .then(data => callback(data)).catch(err => {
                console.error(err);
                if (error) {
                    error(err);
                }
            });
    }
    /**
     * 
     * @param {*} url 
     * @param {*} data 
     * @returns {Promise}
     */
    #asyncGet(url) {
        var promise = new Promise((resolve, reject) => {
            this.#get(url, resolve, reject);
        });
        return promise;
    }

    #post(url, data, callback, error = null) {
        fetch(this.url + url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data),
        }).then(response => response.json())
            .then(data => callback(data)).catch(err => {
                console.error(err);
                if (error) {
                    error(err);
                }
            });
    }
    /**
     * 
     * @param {*} url 
     * @param {*} data
     * @returns {Promise}
     */
    #asyncPost(url, data) {
        var promise = new Promise((resolve, reject) => {
            this.#post(url, data, resolve, reject);
        });
        return promise;
    }

    async getPage(url) {
        return await this.#asyncGet('page?url=' + url);
    }
}

class database {
    constructor() {
        this.db = null;
    }
    async open() {
        var promise = new Promise((resolve, reject) => {
            var request = window.indexedDB.open("reader", 1);
            request.onerror = function (event) {
                reject(event);
            };
            request.onsuccess = function (event) {
                resolve(event);
            };
            request.onupgradeneeded = function (event) {
                var db = event.target.result;
                var objectStore = db.createObjectStore("pages", {
                    keyPath: "url"
                });
                objectStore.createIndex("url", "url", {
                    unique: true
                });

                //options table
                var objectStore = db.createObjectStore("options", {
                    keyPath: "name"
                });
                objectStore.createIndex("name", "name", {
                    unique: true
                });
            };
        });
        var event = await promise;
        this.db = event.target.result;
        return event;
    }

    async addPage(url, content, title) {
        await this.dbOpen();

        var promise = new Promise((resolve, reject) => {
            var transaction = this.db.transaction(["pages"], "readwrite");
            transaction.oncomplete = function (event) {
                resolve(event);
            };
            transaction.onerror = function (event) {
                reject(event);
            };

            //overwrites existing
            var objectStore = transaction.objectStore("pages");
            var request = objectStore.put({
                url: url,
                content: content,
                title: title,
                date: new Date(),
                options: {}
            });
        });
        var event = await promise;
        return event;
    }

    async setPageOption(url, name, value) {
        await this.dbOpen();

        var promise = new Promise((resolve, reject) => {
            var transaction = this.db.transaction(["pages"], "readwrite");
            transaction.oncomplete = function (event) {
                resolve(event);
            };
            transaction.onerror = function (event) {
                reject(event);
            };

            var objectStore = transaction.objectStore("pages");
            var request = objectStore.get(url);
            request.onerror = function (event) {
                reject(event);
            };

            request.onsuccess = function (event) {
                var page = event.target.result;
                page.options[name] = value;
                var requestUpdate = objectStore.put(page);
                requestUpdate.onerror = function (event) {
                    reject(event);
                };
                requestUpdate.onsuccess = function (event) {
                    resolve(event);
                };
            };
        });
        var event = await promise;
        return event;
    }

    async getPage(url) {
        await this.dbOpen();

        var promise = new Promise((resolve, reject) => {
            var transaction = this.db.transaction(["pages"]);
            var objectStore = transaction.objectStore("pages");
            var request = objectStore.get(url);
            request.onerror = function (event) {
                reject(event);
            };
            request.onsuccess = function (event) {
                resolve(event);
            };
        });
        var event = await promise;
        return event.target.result;
    }

    async deletePage(url) {
        await this.dbOpen();

        var promise = new Promise((resolve, reject) => {
            var transaction = this.db.transaction(["pages"], "readwrite");
            transaction.oncomplete = function (event) {
                resolve(event);
            };
            transaction.onerror = function (event) {
                reject(event);
            };
            var objectStore = transaction.objectStore("pages");
            var request = objectStore.delete(url);
        });
        var event = await promise;
        return event;
    }

    async getPages() {
        await this.dbOpen();

        var promise = new Promise((resolve, reject) => {
            var transaction = this.db.transaction(["pages"]);
            var objectStore = transaction.objectStore("pages");
            var request = objectStore.getAll();
            request.onerror = function (event) {
                reject(event);
            };
            request.onsuccess = function (event) {
                resolve(event);
            };
        });
        var event = await promise;
        return event.target.result;
    }

    async dbOpen() {
        if (this.db) {
            return;
        }
        await this.open();
    }

    async setOption(name, value) {
        await this.dbOpen();

        var promise = new Promise((resolve, reject) => {
            var transaction = this.db.transaction(["options"], "readwrite");
            transaction.oncomplete = function (event) {
                resolve(event);
            };
            transaction.onerror = function (event) {
                reject(event);
            };

            //overwrites existing
            var objectStore = transaction.objectStore("options");
            var request = objectStore.put({
                name: name,
                value: value
            });
        });
        var event = await promise;
        return event;
    }

    async getOption(name) {
        await this.dbOpen();

        var promise = new Promise((resolve, reject) => {
            var transaction = this.db.transaction(["options"]);
            var objectStore = transaction.objectStore("options");
            var request = objectStore.get(name);
            request.onerror = function (event) {
                reject(event);
            };
            request.onsuccess = function (event) {
                resolve(event);
            };
        });
        var event = await promise;
        if (event.target.result == undefined) {
            return null;
        }
        return event.target.result.value;
    }

    async optionExists(name) {
        await this.dbOpen();

        var promise = new Promise((resolve, reject) => {
            var transaction = this.db.transaction(["options"]);
            var objectStore = transaction.objectStore("options");
            var request = objectStore.get(name);
            request.onerror = function (event) {
                reject(event);
            };
            request.onsuccess = function (event) {
                resolve(event);
            };
        });
        var event = await promise;
        return event.target.result != undefined;
    }

    async fulldelete() {
        //delete complete database
        await this.dbOpen();
        var promise = new Promise((resolve, reject) => {
            var request = window.indexedDB.deleteDatabase("reader");
            request.onerror = function (event) {
                reject(event);
            };
            request.onsuccess = function (event) {
                resolve(event);
            };
        });
    }
}


class reader {
    constructor() {

    }

    async convertToReader(htmlText, url) {
        var dom = (new DOMParser()).parseFromString(htmlText, "text/html")
        var reader = new Readability(dom, { newBaseURI: url });

        var article = reader.parse();

        var div = document.createElement('div');
        try {
            var cleanArticle = DOMPurify.sanitize(article.content);
        } catch (e) {
            console.error(e);

            var r = await GUI.asyncSelect("Error while sanitizing article. Do you want to continue?", ["Yes", "No"]);
            if (r == "Yes") {
                var cleanArticle = article.content;
            } else {
                cleanArticle = "<p>Article could not be sanitized.</p>";
            }
        }
        return { content: cleanArticle, title: article.title, url: url };
    }

    applyOptions(content, options) {
        var div = document.createElement('div');
        div.innerHTML = content;

        //remove unwanted texts
        if (options.removedTexts == undefined) { options.removedTexts = []; }
        div.querySelectorAll("*").forEach((element) => {
            //only get text nodes
            var walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT, null, false);
            var node;
            while (node = walker.nextNode()) {
                var text = node.nodeValue;
                options.removedTexts.forEach((removedText) => {
                    if (text.includes(removedText)) {
                        node.nodeValue = text.replace(removedText, "");
                    }
                });
            }
        });

        //replace specific texts
        if (options.replaceTexts == undefined) { options.replaceTexts = []; }
        div.querySelectorAll("*").forEach((element) => {
            //only get text nodes
            var walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT, null, false);
            var node;
            while (node = walker.nextNode()) {
                var text = node.nodeValue;
                options.replaceTexts.forEach((replaceText) => {
                    if (text.includes(replaceText["from"])) {
                        node.nodeValue = text.replaceAll(replaceText["from"], replaceText["to"]);
                    }
                });
            }
        });

        //change all links
        div.querySelectorAll("a").forEach((element) => {
            var ogLink = element.getAttribute("href");
            if (!ogLink) {
                return;
            }

            element.setAttribute("href", "javascript:CONTROLLER.pageClicked(`" + ogLink + "`)");
        });

        return div.innerHTML;
    }
}

class controller {
    constructor() {
        this.api = new api();
        this.reader = new reader();
        this.database = new database();
    }
    async getPage(url) {
        var id = GUI.loader.add("Downloading page " + url);
        try {
            var p = await this.api.getPage(url);
        } catch (e) {
            alert(e);
            GUI.loader.remove(id);
            return;
        }
        if (p.status != 'ok') {
            alert('Error');
            GUI.loader.remove(id);
            return;
        }
        var reader = await this.reader.convertToReader(p.content, p.url);
        await this.database.addPage(reader.url, reader.content, reader.title);
        GUI.updatePages();
        GUI.loader.remove(id);
    }
    async showPage(url) {
        var id = GUI.loader.add("Loading page " + url);
        var page = await this.database.getPage(url);
        if (!page) {
            alert('Error');
            GUI.loader.remove(id);
            return;
        }
        GUI.showPage(page.url, page.content, page.title, page.options);
        GUI.loader.remove(id);
    }

    async reloadPage() {
        var id = GUI.loader.add("Reloading page");
        var page = await this.database.getPage(GUI.currentPage);
        GUI.showPage(page.url, page.content, page.title, page.options);
        GUI.loader.remove(id);
    }

    pageClicked(url) {
        GUI.pageReader.optionsOpen = false;
        GUI.pageReader.updateOptions();
        GUI.openSelect({
            title: "Clicked link (" + url + ")",
            options: [
                {
                    text: "Open in browser",
                    action: () => {
                        window.open(url, '_blank');
                    }
                },
                {
                    text: "Download page",
                    action: () => {
                        CONTROLLER.getPage(url);
                    }
                },
                {
                    text: "Download and open page",
                    action: async () => {
                        await CONTROLLER.getPage(url);
                        CONTROLLER.showPage(url);
                    }
                }
            ]
        })
    }
}

window.onload = () => {
    window.CONTROLLER = new controller();
    window.GUI = new gui();
}

/**
 * @type {controller}
 */
// sourcery skip: avoid-using-var
var CONTROLLER;
/**
 * @type {gui}
 */
var GUI;
