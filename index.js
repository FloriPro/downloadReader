var SKIPSANIZING = true;

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
        this.pageDisplayTypes = null;
        this.loadDisplayTypes();

        //save scroll position
        //alert("scrollend " + (("onscrollend" in window) ? "supported" : "not supported"))
        if ("onscrollend" in window) {
            this.cooldown = null;
            window.addEventListener('scrollend', this.saveScrollPosition.bind(this));
        } else {
            this.cooldown = 0;
            window.addEventListener('scroll', this.saveScrollPosition.bind(this));
        }
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
                "middle spacing, border": "type1container",
                "small spacing": "smallSpacingContainer",
                "middle spacing ": "middleSpacingContainer",
                "large spacing": "largeSpacingContainer",
                "no spacing": "type2container",
            },
            Color: {
                "Light": "type1color",
                "Dark": "type2color",
                "Dark Dark": "type23color",
                "Mid Dark": "type3color",
                "Atomic Dark": "atomicDarkColor",
                "Iplastic": "iplasticColor",
                "Monokai": "monokaiColor",
                "Dracula": "draculaColor",
                "Kimbie Dark": "kimbieDarkColor",
                "Solarized Dark": "solarizedDarkColor",
                "Solarized Light": "solarizedLightColor",
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
                    "Atomic Dark": "1d1f21",
                    "Iplastic": "#1e1e1e",
                    "Solarized Light": "#fdf6e3",
                    "Monokai": "#272822",
                    "Dracula": "#282a36",
                    "Kimbie Dark": "#221a0f",
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
        document.getElementById('addUrlDiv').style.display = "";
        /*var url = prompt('Enter URL', '');
        if (!url) {
            return;
        }
        CONTROLLER.getPage(url);*/
    }

    urlAddClick() {
        var url = document.querySelector("#addUrlUrl").value;
        if (url == "" || url == null) {
            return;
        }
        document.getElementById('addUrlDiv').style.display = "none";
        CONTROLLER.getPage(url);
    }

    urlAddCancel() {
        document.getElementById('addUrlDiv').style.display = "none";
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

            div.innerHTML = '';//clear div because the function before can take some time (fails with multiple simultaneous downloads)

            if (urlGroupClosed == null) {
                urlGroupClosed = this.resetUrlGroupClosed(t);
                CONTROLLER.database.setOption("pagedTreeClosed", urlGroupClosed);
            } else {
                urlGroupClosed = this.updateUrlGroupeClosed(t, urlGroupClosed);
                CONTROLLER.database.setOption("pagedTreeClosed", urlGroupClosed);
            }

            for (var x of Object.keys(t)) {
                let pt = this.displayPageTree(t[x]["me"], t[x]["children"], urlGroupClosed[x], x, urlGroupClosed);
                div.appendChild(pt);
            }
        }

        //load Books
        const bookDiv = document.querySelector('#downloadedBooks');
        const books = await CONTROLLER.database.getBooks();
        bookDiv.innerHTML = '';
        let urlGroupClosed = await CONTROLLER.database.getOption("pagedBookTreeClosed");
        if (urlGroupClosed == null) {
            console.warn("pagedBookTreeClosed not found, resetting");
            urlGroupClosed = {};
            for (let i = 0; i < books.length; i++) {
                urlGroupClosed[books[i].bookId] = true;
            }
            CONTROLLER.database.setOption("pagedBookTreeClosed", urlGroupClosed);
        }
        bookDiv.innerHTML = '';
        for (let i = 0; i < books.length; i++) {
            bookDiv.appendChild(this.getBook(books[i], urlGroupClosed));
        }

        this.loader.remove(id);
    }


    switcher(condition, onTrue, onFalse) {
        if (condition) {
            return onTrue;
        }
        return onFalse;
    }

    getChapter(book, chapter) {
        let div = document.createElement('div');
        let divTop = div;
        div.classList.add('chapter');
        div.classList.add(this.switcher(this.minimalMode, "minimalDownloadedPage", "downloadedPage"));
        div.onclick = (event) => {
            event.stopPropagation();
            CONTROLLER.showBook(book.bookId, chapter.chapterId);
        }

        if (this.minimalMode) {
            div = document.createElement('div');
            div.classList.add("minimalDownloadedPageInfoWrapper");
            divTop.appendChild(div);
        }

        const title = document.createElement('p');
        title.classList.add(this.switcher(this.minimalMode, "minimalDownloadedPageName", 'chapterTitle'));
        title.innerText = chapter.title;
        div.appendChild(title);

        const pUrl = document.createElement('p');
        pUrl.innerText = chapter.url;
        pUrl.style.fontSize = "0.8em";
        pUrl.style.overflowWrap = "anywhere";
        if (this.minimalMode) {
            pUrl.classList.add("minimalDownloadedPageUrl");
        }
        div.appendChild(pUrl);

        const redownloadButton = document.createElement('button');
        redownloadButton.classList.add(this.switcher(this.minimalMode, "minimalRedownload", 'bookRedownloadButton'));
        redownloadButton.innerText = "Redownload";
        redownloadButton.onclick = (event) => {
            event.stopPropagation();
            CONTROLLER.getPage(chapter.url);
        }
        div.appendChild(redownloadButton);

        const deleteButton = document.createElement('button');
        deleteButton.classList.add(this.switcher(this.minimalMode, "minimalDelete", 'bookDeleteButton'));
        deleteButton.innerText = "Delete";
        deleteButton.onclick = (event) => {
            event.stopPropagation();
            CONTROLLER.database.deleteChapter(book.bookId, chapter.chapterId);
            this.updatePages();
        }
        div.appendChild(deleteButton);

        return divTop;
    }

    getBook(book, urlGroupClosed) {
        let div = document.createElement('div');
        var divTop = div;
        div.classList.add('book');
        div.classList.add(this.switcher(this.minimalMode, "minimalDownloadedPage", "downloadedPage"));
        div.onclick = (event) => {
            event.stopPropagation();
            CONTROLLER.showBook(book.bookId);
        }

        var downloadedPageInfoDiv = document.createElement('div');

        if (book.image != null) {
            var img = document.createElement('img');
            img.src = book.image;
            img.classList.add(this.switcher(this.minimalMode, "minimalDownloadedPageImage", 'bookImage'));
            div.append(img);

            downloadedPageInfoDiv.classList.add("hasImage");
        }


        if (this.minimalMode) {
            div = document.createElement('div');
            div.classList.add("minimalDownloadedPageInfoWrapper");
            divTop.appendChild(div);
        }

        const title = document.createElement('p');
        title.classList.add(this.switcher(this.minimalMode, "minimalDownloadedPageName", 'title'));
        title.innerText = book.name;
        downloadedPageInfoDiv.appendChild(title);

        //Tree View
        let wrapper = document.createElement('div');
        wrapper.classList.add("pageTreeWrapper");
        let ul = document.createElement('ul');
        ul.classList.add('pageTreeUl');
        wrapper.appendChild(ul);

        const pages = document.createElement('div');
        pages.classList.add(this.switcher(this.minimalMode, "minimalDownloadedPageUrl", 'bookPages'));
        pages.innerText = "... page(s)";
        CONTROLLER.database.getChapters(book.bookId).then((chapters) => {
            pages.innerText = chapters.length + " page(s)";

            for (let i = 0; i < chapters.length; i++) {
                let li = this.getChapter(book, chapters[i]);
                ul.appendChild(li);
            }
            if (chapters.length != 0) {
                let closeBtn = document.createElement('button');
                closeBtn.classList.add('pageTreeCloseBtn');
                closeBtn.innerText = "X";
                closeBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    ul.classList.toggle('pageTreeWrapperClosed');
                    urlGroupClosed[book.bookId] = ul.classList.contains('pageTreeWrapperClosed');
                    CONTROLLER.database.setOption("pagedBookTreeClosed", urlGroupClosed);
                    if (ul.classList.contains('pageTreeWrapperClosed')) {
                        closeBtn.innerText = ">";
                        div.classList.remove('bookTreeWrapperOpen');
                    } else {
                        closeBtn.innerText = "X";
                        div.classList.add('bookTreeWrapperOpen');
                    }
                });

                if (urlGroupClosed[book.bookId]) {
                    ul.classList.add('pageTreeWrapperClosed');
                    closeBtn.innerText = ">";
                }
                wrapper.appendChild(closeBtn);
            }
        });
        downloadedPageInfoDiv.appendChild(pages);

        const navigationButton = document.createElement('button');
        navigationButton.classList.add('bookNavigationButton');
        navigationButton.innerText = "Chapters";
        navigationButton.onclick = (event) => {
            event.stopPropagation();
            CONTROLLER.showBookChapters(book.bookId);
        }
        downloadedPageInfoDiv.appendChild(navigationButton);

        const redownloadButton = document.createElement('button');
        redownloadButton.classList.add(this.switcher(this.minimalMode, "minimalRedownload", 'bookRedownloadButton'));
        redownloadButton.classList.add('redownload');
        redownloadButton.innerText = "Redownload";
        redownloadButton.onclick = (event) => {
            event.stopPropagation();
            CONTROLLER.getPage(book.url)
        }
        downloadedPageInfoDiv.appendChild(redownloadButton);

        const deleteButton = document.createElement('button');
        deleteButton.classList.add(this.switcher(this.minimalMode, "minimalDelete", 'bookDeleteButton'));
        deleteButton.classList.add('delete');
        deleteButton.innerText = "Delete";
        deleteButton.onclick = (event) => {
            event.stopPropagation();
            if (!confirm("Are you sure you want to delete this book?")) {
                return;
            }
            var id = GUI.loader.add();
            CONTROLLER.database.deleteBook(book.bookId).then(() => {
                this.updatePages();
                GUI.loader.remove(id);
            });
        }
        downloadedPageInfoDiv.appendChild(deleteButton);

        downloadedPageInfoDiv.appendChild(wrapper);

        div.appendChild(downloadedPageInfoDiv);

        return divTop;
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

    //add new url to urlGroupClosed and return it
    updateUrlGroupeClosed(t, urlGroupClosed) {
        for (var x of Object.keys(t)) {
            if (urlGroupClosed[x] == undefined) {
                urlGroupClosed[x] = {
                    "closed": false,
                    "children": this.resetUrlGroupClosed(t[x]["children"]),
                }
            }
            urlGroupClosed[x]["children"] = this.updateUrlGroupeClosed(t[x]["children"], urlGroupClosed[x]["children"]);
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
        //remove after ?
        if (nu.includes('?')) {
            nu = nu.split('?')[0];
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

        const divTop = document.createElement('div');
        divTop.classList.add('downloadedPage');
        divTop.onclick = this.pageClick.bind(this, url);

        const div = document.createElement('div');
        divTop.appendChild(div);

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


        return divTop;
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
        event.stopPropagation();
        CONTROLLER.database.deletePage(url);
        this.updatePages();
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
            this.currentPageType = null;
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
        if (this.pageDisplayTypesDom[type].items[type2] == null) {
            type2 = Object.keys(this.pageDisplayTypes[type])[0];
        }
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

    async saveScrollPosition() {
        if (this.currentPage == null) {
            return;
        }
        const cooldownTimeout = 250;
        if (this.cooldown != null && new Date().getTime() - this.cooldown < cooldownTimeout) {
            return;
        }

        const scroll = window.scrollY;
        if (this.cooldown != null) {
            this.cooldown = new Date().getTime();
        }
        await this.pageReader.setPageOption("scroll", scroll);
        console.log("saved scroll position: " + scroll);
    }

    applyScrollPosition() {
        const loaderScrollPos = this.loader.add("Loading scroll position...");
        this.pageReader.getOption("scroll").then(scroll => {
            if (scroll != null) {
                window.scrollTo(0, scroll);
                console.log("loaded scroll position: " + scroll);
            } else {
                window.scrollTo(0, 0);
            }
            this.loader.remove(loaderScrollPos);
        }).catch(err => {
            console.log(err);
            this.loader.remove(loaderScrollPos);
        });
    }

    showPage(url, content, title, options) {
        this.showTab("Page");
        document.querySelector("#bookOptions").style.display = "none";
        document.querySelector('#bookHeader').style.display = "none";
        document.querySelector('#chaptersBookHeader').style.display = "none";
        document.querySelector('#bookFooter').style.display = "none";

        document.querySelector('#pageUrl').innerText = url;
        document.querySelector('#pageContentBody').innerHTML = CONTROLLER.reader.applyOptions(content, options);
        document.querySelector('#pageContentTitle').innerText = title;

        CONTROLLER.reader.applyAsyncOptions(document.querySelector('#pageContentBody'), options);

        this.currentPage = url;
        this.currentPageType = "page";

        this.applyScrollPosition();
    }

    showBook(url, content, title, options, bookId, chapterId) {
        this.showPage(url, content, title, options);
        document.querySelector("#bookOptions").style.display = "";
        if (chapterId != null) {
            document.querySelector("#bookOptionViewBook").style.display = "none";
            document.querySelector("#bookOptionViewChapters").style.display = "";
            document.querySelector('#bookHeader').style.display = "";
            document.querySelector('#bookFooter').style.display = "";
        } else {
            document.querySelector('#chaptersBookHeader').style.display = "";
            document.querySelector("#bookOptionViewBook").style.display = "";
            document.querySelector("#bookOptionViewChapters").style.display = "none";

            //mark current chapter
            CONTROLLER.database.getBook(bookId).then(async book => {
                let currentChapterUrl = null;
                currentChapterUrl = book.lastChapter;
                if (currentChapterUrl == null) {
                    return;
                }

                currentChapterUrl = (await CONTROLLER.database.getChapter(bookId, currentChapterUrl)).url;
                console.log(currentChapterUrl);

                const selector = `a[href="javascript:CONTROLLER.pageClicked(\`${currentChapterUrl}\`)"]`
                document.querySelector(selector).classList.add("currentChapter")
            });
        }

        this.currentChapterId = chapterId;
        this.currentBookId = bookId;
        this.currentPageType = "book";

        this.applyScrollPosition();
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

    async asyncAlert(title) {
        var r = await this.asyncSelect(title, ["OK"]);
        return r;
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
        //if clicked on top or bottom of screen
        if ((event.clientY < window.innerHeight / 5 || event.clientY > window.innerHeight / 5 * 4 || event.clientX < window.innerWidth / 5 || event.clientX > window.innerWidth / 5 * 4) && !this.optionsOpen) {
            return;
        }

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
        // sourcery skip: use-ternary-operator
        if (GUI.currentPageType == "book") {
            var data = GUI.currentChapterId == null ? await CONTROLLER.database.getBook(GUI.currentBookId) : await CONTROLLER.database.getChapter(GUI.currentBookId, GUI.currentChapterId);
        } else {
            var data = await CONTROLLER.database.getPage(GUI.currentPage);
        }

        this.removedTexts = [];
        if (data.options.removedTexts) {
            this.removedTexts = data.options.removedTexts;
        }
        this.replaceTexts = [];
        if (data.options.replaceTexts) {
            this.replaceTexts = data.options.replaceTexts;
        }
        let editPanelRemoveTextsList = document.querySelector('#editPanelRemoveTextsList');
        editPanelRemoveTextsList.innerHTML = '';
        for (var t of this.removedTexts) {
            var p = document.createElement('p');
            p.innerText = t;
            p.title = "click to remove";
            p.onclick = this.removeRemoveText.bind(this, t);
            editPanelRemoveTextsList.appendChild(p);
        }

        let editPanelReplaceTextsList = document.querySelector('#editPanelReplaceTextsList');
        editPanelReplaceTextsList.innerHTML = '';
        for (var t of this.replaceTexts) {
            var p = document.createElement('p');
            p.innerText = t["from"] + " -> " + t["to"];
            p.title = "click to remove";
            p.onclick = this.removeEditText.bind(this, t);
            editPanelReplaceTextsList.appendChild(p);
        }
    }

    setPageOption(option, value) {
        if (GUI.currentPageType == "book") {
            if (GUI.currentChapterId == null) {
                var p = new Promise((resolve, reject) => {
                    CONTROLLER.database.setBookOption(GUI.currentBookId, option, value).then(() => {
                        GUI.pageReader.makeEditPanel();
                        resolve();
                    });
                });
                return p;
            } else {
                var p = new Promise((resolve, reject) => {
                    CONTROLLER.database.setChapterOption(GUI.currentBookId, GUI.currentChapterId, option, value).then(() => {
                        GUI.pageReader.makeEditPanel();
                        resolve();
                    });
                });
                return p;
            }
        } else {
            var p = new Promise((resolve, reject) => {
                CONTROLLER.database.setPageOption(GUI.currentPage, option, value).then(() => {
                    GUI.pageReader.makeEditPanel();
                    resolve();
                });
            });
            return p;
        }
    }

    async getOption(option) {
        // sourcery skip: use-ternary-operator
        if (GUI.currentPageType == "book") {
            var data = GUI.currentChapterId == null ? await CONTROLLER.database.getBook(GUI.currentBookId) : await CONTROLLER.database.getChapter(GUI.currentBookId, GUI.currentChapterId);
        } else {
            var data = await CONTROLLER.database.getPage(GUI.currentPage);
        }

        if (data == null) {
            return null;
        }

        if (data.options[option]) {
            return data.options[option];
        }
        return null;
    }

    addRemoveText() {
        var text = document.querySelector('#editPanelRemoveTextsInput').value;
        if (text && text != "" && text != " ") {
            this.removedTexts.push(text);
            this.setPageOption("removedTexts", this.removedTexts);
        }
        document.querySelector('#editPanelRemoveTextsInput').value = "";
    }
    removeRemoveText(text) {
        this.removedTexts.splice(this.removedTexts.indexOf(text), 1);
        this.setPageOption("removedTexts", this.removedTexts);
    }

    addReplaceText() {
        var text = document.querySelector('#editPanelReplaceTextsInput').value;
        var text2 = document.querySelector('#editPanelReplaceTextsInput2').value;
        if (text && text != "" && text != " " && text2 && text2 != "" && text2 != " ") {
            this.replaceTexts.push({ from: text, to: text2 });
            this.setPageOption("replaceTexts", this.replaceTexts);
        }
        document.querySelector('#editPanelReplaceTextsInput').value = "";
        document.querySelector('#editPanelReplaceTextsInput2').value = "";
    }

    removeEditText(text) {
        this.replaceTexts.splice(this.replaceTexts.indexOf(text), 1);
        this.setPageOption("replaceTexts", this.replaceTexts);
    }

    async loadMassDownloadLinks() {
        document.querySelector("#editPanelMassDownloadLinksApply").style.display = '';
        document.querySelector("#editPanelMassDownloadLinksCancel").style.display = '';
        document.querySelector("#editPanelMassDownloadLinksLoad").style.display = 'none';

        document.querySelector("#editPanelMassDownloadLinksList").style.display = "";
        document.querySelector("#editPanelMassDownloadLinksList").innerHTML = "";
        // sourcery skip: use-ternary-operator
        if (GUI.currentPageType == "book") {
            var data = GUI.currentChapterId == null ? await CONTROLLER.database.getBook(GUI.currentBookId) : await CONTROLLER.database.getChapter(GUI.currentBookId, GUI.currentChapterId);
        } else {
            var data = await CONTROLLER.database.getPage(GUI.currentPage);
        }

        let htmdiv = document.createElement("div");
        htmdiv.innerHTML = data.content;
        let links = htmdiv.querySelectorAll("a");

        let plinks = [];
        for (var link of links) {
            var p = document.createElement("p");
            p.innerText = link.innerText + " >> " + link.href;
            p.onclick = this.massDownloadStuff.click.bind(this.massDownloadStuff, p, link.href, link.innerText);
            document.querySelector("#editPanelMassDownloadLinksList").appendChild(p);
            plinks.push(link.href);
        }
        this.massDownloadStuff.setLinks(plinks);
    }

    async applyMassDownloadLinks() {
        var links = this.massDownloadStuff.getLinks();
        this.cancelMassDownloadLinks();

        var maxCount = 30;
        var currentRunning = [];

        for (var link of links) {
            ((link) => {
                var prom = new Promise(async (resolve, reject) => {
                    await CONTROLLER.getPage(link, false);
                    resolve();

                    //remove from currentRunning
                    currentRunning.splice(currentRunning.indexOf(prom), 1);
                });
                currentRunning.push(prom);
            })(link);
            if (currentRunning.length >= maxCount) {
                await Promise.race(currentRunning);
            }
        }
        await Promise.all(currentRunning);
        await GUI.updatePages();
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

    async #asyncDataGet(url) {
        var d = await fetch(this.url + url);
        //return data url: data:image/jpg;base64,
        var data = await d.blob();
        var reader = new FileReader();
        reader.readAsDataURL(data);
        var promise = new Promise((resolve, reject) => {
            reader.onloadend = function () {
                resolve(reader.result);
            }
        });
        return await promise;
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

    async getImage(url) {
        return await this.#asyncDataGet('page?url=' + url + "&type=data");
    }
}

class database {
    constructor() {
        /**
         * @type {IDBDatabase}
         */
        this.db = null;
    }
    async open() {
        var promise = new Promise((resolve, reject) => {
            var request = window.indexedDB.open("reader", 2);
            request.onerror = function (event) {
                reject(event);
            };
            request.onsuccess = function (event) {
                resolve(event);
            };
            request.onupgradeneeded = function (event) {
                /**
                 * @type {IDBDatabase}
                 */
                var db = event.target.result;

                //pages table
                if (!db.objectStoreNames.contains("pages")) {
                    var objectStore = db.createObjectStore("pages", {
                        keyPath: "url"
                    });
                    objectStore.createIndex("url", "url", {
                        unique: true
                    });
                }

                //options table
                if (!db.objectStoreNames.contains("options")) {
                    var objectStore = db.createObjectStore("options", {
                        keyPath: "name"
                    });
                    objectStore.createIndex("name", "name", {
                        unique: true
                    });
                }

                //books table
                if (!db.objectStoreNames.contains("books")) {
                    var objectStore = db.createObjectStore("books", {
                        keyPath: "bookId",
                    });
                    objectStore.createIndex("bookId", "bookId", {
                        unique: true
                    });
                }

                //chapters table: bookid, chapterid
                if (!db.objectStoreNames.contains("chapters")) {
                    var objectStore = db.createObjectStore("chapters", {
                        keyPath: ["bookId", "chapterId"]
                    });
                    objectStore.createIndex("bookId", "bookId", {
                        unique: false
                    });
                    objectStore.createIndex("chapterId", "chapterId", {
                        unique: false
                    });
                }
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

    async setBookOption(bookId, name, value) {
        await this.dbOpen();

        var promise = new Promise((resolve, reject) => {
            var transaction = this.db.transaction(["books"], "readwrite");

            var objectStore = transaction.objectStore("books");
            var request = objectStore.get(bookId);
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

    async setChapterOption(bookId, chapterId, name, value) {
        await this.dbOpen();

        var promise = new Promise((resolve, reject) => {
            var transaction = this.db.transaction(["chapters"], "readwrite");

            var objectStore = transaction.objectStore("chapters");
            var request = objectStore.get([bookId, chapterId]);
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

    async bookExists(bookId) {
        await this.dbOpen();

        var promise = new Promise((resolve, reject) => {
            var transaction = this.db.transaction(["books"]);
            var objectStore = transaction.objectStore("books");
            var request = objectStore.get(bookId);
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

    async getBook(bookId) {
        await this.dbOpen();

        var promise = new Promise((resolve, reject) => {
            var transaction = this.db.transaction(["books"]);
            var objectStore = transaction.objectStore("books");
            var request = objectStore.get(bookId);
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

    async getBooks() {
        await this.dbOpen();

        var promise = new Promise((resolve, reject) => {
            var transaction = this.db.transaction(["books"]);
            var objectStore = transaction.objectStore("books");
            //only get bookId, chapterId and name, not the content
            var request = objectStore.getAll();
            request.onerror = function (event) {
                reject(event);
            }
            request.onsuccess = function (event) {
                resolve(event);
            }
        });
        var event = await promise;
        return event.target.result;
    }

    async deleteBook(bookId) {
        //delete the book and all chapters
        await this.dbOpen();

        var promise = new Promise((resolve, reject) => {
            var transaction = this.db.transaction(["books"], "readwrite");
            transaction.oncomplete = function (event) {
                resolve(event);
            };
            transaction.onerror = function (event) {
                reject(event);
            };
            var objectStore = transaction.objectStore("books");
            var request = objectStore.delete(bookId);
        });
        var event = await promise;

        var chapters = await this.getChapters(bookId);
        for (var i = 0; i < chapters.length; i++) {
            var lid = GUI.loader.add("Deleting chapter " + (i + 1) + " of " + chapters.length);
            await this.deleteChapter(bookId, chapters[i].chapterId);
            GUI.loader.remove(lid);
        }
        return event;
    }

    async deleteChapter(bookId, chapterId) {
        //delete the chapter
        await this.dbOpen();

        var promise = new Promise((resolve, reject) => {
            var transaction = this.db.transaction(["chapters"], "readwrite");
            transaction.oncomplete = function (event) {
                resolve(event);
            };
            transaction.onerror = function (event) {
                reject(event);
            };
            var objectStore = transaction.objectStore("chapters");
            var request = objectStore.delete([bookId, chapterId]);
        });
        var event = await promise;
        return event;
    }

    async setBook(bookId, name, content, url, lastChapter = null, options = {}) {
        await this.dbOpen();

        var promise = new Promise((resolve, reject) => {
            var transaction = this.db.transaction(["books"], "readwrite");
            transaction.oncomplete = function (event) {
                resolve(event);
            };
            transaction.onerror = function (event) {
                reject(event);
            };
            var objectStore = transaction.objectStore("books");
            var getRequest = objectStore.get(bookId);
            getRequest.onerror = function (event) {
                reject(event);
            };
            getRequest.onsuccess = function (event) {
                var book = event.target.result;
                var image = book ? book.image : null;
                var request = objectStore.put({
                    bookId: bookId,
                    name: name,
                    content: content,
                    url: url,
                    lastChapter: lastChapter,
                    options: options,
                    date: new Date(),
                    image: image
                });
            };
        });
        var event = await promise;
        return event;
    }

    async addBookImage(bookId, image) {
        await this.dbOpen();

        var promise = new Promise((resolve, reject) => {
            var transaction = this.db.transaction(["books"], "readwrite");
            transaction.oncomplete = function (event) {
                resolve(event);
            };
            transaction.onerror = function (event) {
                reject(event);
            };
            var objectStore = transaction.objectStore("books");
            var request = objectStore.get(bookId);
            request.onerror = function (event) {
                reject(event);
            };
            request.onsuccess = function (event) {
                var book = event.target.result;
                book.image = image;
                var requestUpdate = objectStore.put(book);
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

    async addChapter(bookId, chapterId, content, title, url) {
        await this.dbOpen();

        var promise = new Promise((resolve, reject) => {
            var transaction = this.db.transaction(["chapters"], "readwrite");
            transaction.oncomplete = function (event) {
                resolve(event);
            };
            transaction.onerror = function (event) {
                reject(event);
            };
            var objectStore = transaction.objectStore("chapters");
            var request = objectStore.put({
                bookId: bookId,
                chapterId: chapterId,
                content: content,
                title: title,
                url: url,
                date: new Date(),
                options: {}
            });
        });
        var event = await promise;
        return event;
    }

    async getChapter(bookId, chapterId) {
        await this.dbOpen();

        var promise = new Promise((resolve, reject) => {
            var transaction = this.db.transaction(["chapters"]);
            var objectStore = transaction.objectStore("chapters");
            var request = objectStore.get([bookId, chapterId]);
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

    async getChapters(bookId) {
        await this.dbOpen();

        var promise = new Promise((resolve, reject) => {
            var transaction = this.db.transaction(["chapters"]);
            var objectStore = transaction.objectStore("chapters");
            var request = objectStore.getAll();
            request.onerror = function (event) {
                reject(event);
            }
            request.onsuccess = function (event) {
                resolve(event);
            }
        });
        var event = await promise;
        return event.target.result.filter((chapter) => chapter.bookId == bookId);
    }

    async getAllChapters() {
        await this.dbOpen();

        var promise = new Promise((resolve, reject) => {
            var transaction = this.db.transaction(["chapters"]);
            var objectStore = transaction.objectStore("chapters");
            var request = objectStore.getAll();
            request.onerror = function (event) {
                reject(event);
            }
            request.onsuccess = function (event) {
                resolve(event);
            }
        });
        var event = await promise;
        return event.target.result;
    }

    async getChapterFromUrl(url) {
        await this.dbOpen();

        var promise = new Promise((resolve, reject) => {
            var transaction = this.db.transaction(["chapters"]);
            var objectStore = transaction.objectStore("chapters");
            var request = objectStore.getAll();
            request.onerror = function (event) {
                reject(event);
            }
            request.onsuccess = function (event) {
                resolve(event);
            }
        });
        var event = await promise;
        var chapters = event.target.result;
        for (var i = 0; i < chapters.length; i++) {
            if (chapters[i].url == url) {
                return chapters[i];
            }
        }
        return null;
    }

    async getBookFromUrl(url) {
        await this.dbOpen();

        var promise = new Promise((resolve, reject) => {
            var transaction = this.db.transaction(["books"]);
            var objectStore = transaction.objectStore("books");
            var request = objectStore.getAll();
            request.onerror = function (event) {
                reject(event);
            }
            request.onsuccess = function (event) {
                resolve(event);
            }
        });
        var event = await promise;
        var books = event.target.result;
        for (var i = 0; i < books.length; i++) {
            if (books[i].url == url) {
                return books[i];
            }
        }
        return null;
    }

    async getBookChapterIdFromUrl(bookId, url) {
        var chapters = await this.getChapters(bookId);
        for (var i = 0; i < chapters.length; i++) {
            if (chapters[i].url == url) {
                return chapters[i].chapterId;
            }
        }
        return null;
    }

    sortByChapterId(chapters) {
        return chapters.sort((a, b) => a.chapterId - b.chapterId);
    }
    chapterIdMap(chapters) {
        var map = {};
        for (var i = 0; i < chapters.length; i++) {
            map[chapters[i].chapterId] = chapters[i];
        }
        return map;
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
            if (article == null) {
                await GUI.asyncAlert("Error while loading article. Article is null.");
                cleanArticle = "<p>Article could not be loaded from site</p>";
                article = { title: "Error Loading" };
            } else {
                if (SKIPSANIZING) {
                    r = "Yes";
                } else {
                    var r = await GUI.asyncSelect("Error while sanitizing article. Do you want to continue?", ["Yes", "No"]);
                }
                if (r == "Yes") {
                    var cleanArticle = article.content;
                } else {
                    cleanArticle = "<p>Article could not be sanitized.</p>";
                }
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

    async applyAsyncOptions(div, options) {
        //mark all undownloaded pages
        const books = await CONTROLLER.database.getBooks();
        const chapters = await CONTROLLER.database.getAllChapters();
        const pages = await CONTROLLER.database.getPages();

        const bookUrls = books.map((book) => book.url);
        const chapterUrls = chapters.map((chapter) => chapter.url);
        const pageUrls = pages.map((page) => page.url);

        div.querySelectorAll("a").forEach(async (element) => {
            //console.log(element);
            var ogLink = element.getAttribute("href");
            if (!ogLink) {
                return;
            }

            ogLink = ogLink.replaceAll("javascript:CONTROLLER.pageClicked(`", "");
            ogLink = ogLink.replaceAll("`)", "");

            //check if page is downloaded
            /*console.log(await CONTROLLER.database.getChapterFromUrl(ogLink))
            var bookId = await CONTROLLER.database.getPage(ogLink);
            if (!bookId) {
                bookId = await CONTROLLER.database.getChapterFromUrl(ogLink);
                if (!bookId) {
                    bookId = await CONTROLLER.database.getBookFromUrl(ogLink);
                    if (!bookId) {
                        element.classList.add("notdownloaded");
                    }
                }
            }
            
            if (bookId) {
                element.classList.add("downloaded");
            }else{
                element.classList.add("notdownloaded");
            }
            */
            if (bookUrls.includes(ogLink) || chapterUrls.includes(ogLink) || pageUrls.includes(ogLink)) {
                element.classList.add("downloaded");
            } else {
                element.classList.add("notdownloaded");
            }

        });
    }

    /**
     * @returns {[boolean, string, string, string, string, {[key:string ]: string}]} [isBook, type: chapter|book, bookid, chapter, {options}]
     */
    checkForBook(htmlText, url) {
        //check if page has meta tag with "downloadreaderbook"="<bookid>"
        var dom = (new DOMParser()).parseFromString(htmlText, "text/html")
        var meta = dom.querySelector("meta[name='downloadReaderBook']");
        if (!meta) {
            return [false, null, null, null, {}];
        }

        var options = {};

        var bookid = meta.getAttribute("content");
        var type = "book" // or chapter
        var image = null;

        var chapter = null;
        var metaChapter = dom.querySelector("meta[name='downloadReaderChapter']");
        if (metaChapter) {
            type = "chapter";
            chapter = metaChapter.getAttribute("content");
        }

        var metaName = dom.querySelector("meta[name='downloadReaderName']");
        if (metaName) {
            options.name = metaName.getAttribute("content");
        } else {
            options.name = dom.querySelector("title").textContent;
        }

        var metaImage = dom.querySelector("meta[name='downloadReaderImage']");
        if (metaImage) {
            image = metaImage.getAttribute("content");
        }

        return [true, type, bookid, chapter, image, options];
    }
}

class controller {
    constructor() {
        this.api = new api();
        this.reader = new reader();
        this.database = new database();
    }
    async getPage(url, update = true) {
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
        var isBook = this.reader.checkForBook(p.content, p.url);
        var reader = await this.reader.convertToReader(p.content, p.url);

        if (isBook[0]) {
            var [isbook, type, bookid, chapter, imageUrl, options] = isBook;
            //check if book allready exists
            var book = await this.database.bookExists(bookid);
            var bookExists = book;
            if (type == "book" || !book) {
                let lastChapter = null;
                if (book) {
                    lastChapter = (await this.database.getBook(bookid)).lastChapter;
                }
                await this.database.setBook(bookid, options.name, reader.content, reader.url, lastChapter);
                book = await this.database.getBook(bookid);

                if (imageUrl) {
                    var imageData = await this.api.getImage(imageUrl);
                    await this.database.addBookImage(bookid, imageData);
                }

                if (!bookExists) {
                    var a = await GUI.asyncSelect("Do you want to download all chapters?", ["Yes", "No"]);
                    if (a == "Yes") {
                        var idChapters = GUI.loader.add("Downloading chapters");
                        var page = (await this.database.getBook(bookid)).content;
                        var pageDiv = document.createElement('div');
                        pageDiv.innerHTML = page;
                        var linksA = pageDiv.querySelectorAll("a");
                        var links = [];
                        for (var i = 0; i < linksA.length; i++) {
                            links.push(linksA[i].getAttribute("href"));
                        }

                        var maxCount = 30;
                        var currentRunning = [];
                        for (var link of links) {
                            ((link) => {
                                var prom = new Promise(async (resolve, reject) => {
                                    await CONTROLLER.getPage(link, false);
                                    resolve();

                                    //remove from currentRunning
                                    currentRunning.splice(currentRunning.indexOf(prom), 1);
                                });
                                currentRunning.push(prom);
                            })(link);
                            if (currentRunning.length >= maxCount) {
                                await Promise.race(currentRunning);
                            }
                        }
                        await Promise.all(currentRunning);
                        GUI.updatePages();
                        GUI.loader.remove(idChapters);
                    }
                }
            }
            if (type == "chapter") {
                await this.database.addChapter(bookid, chapter, reader.content, reader.title, reader.url);
            }
        } else {
            await this.database.addPage(reader.url, reader.content, reader.title);
        }

        if (update) {
            GUI.updatePages();
        }
        GUI.loader.remove(id);

        return isBook;
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

    async showBook(bookid, chapterid = null) {
        var id = GUI.loader.add("Loading book " + bookid);
        var book = await this.database.getBook(bookid);
        if (!book) {
            alert('Error');
            GUI.loader.remove(id);
            return;
        }
        //check if book has chapters
        var chapters = await this.database.getChapters(bookid);
        if (chapters.length > 0) {
            //show latest chapter
            if (book.lastChapter == null || chapterid != null) {
                if (chapterid == null) {
                    chapters = this.database.sortByChapterId(chapters);
                    book.lastChapter = chapters[0].chapterId;
                } else {
                    book.lastChapter = chapterid;
                }
                this.database.setBook(bookid, book.name, book.content, book.url, book.lastChapter);
            }
            var chapter = await this.database.getChapter(bookid, book.lastChapter);
            GUI.showBook(chapter.url, chapter.content, chapter.title, chapter.options, bookid, chapter.chapterId);
        } else {
            this.showBookChapters(bookid);
        }

        GUI.loader.remove(id);
    }
    async nextChapter() {
        var id = GUI.loader.add("Loading next chapter");
        var book = await this.database.getBook(GUI.currentBookId);
        if (!book) {
            alert('Error');
            GUI.loader.remove(id);
            return;
        }
        var chapters = await this.database.getChapters(book.bookId);
        chapters = this.database.sortByChapterId(chapters);
        var nextChapter = null;
        for (var i = 0; i < chapters.length; i++) {
            if (chapters[i].chapterId == book.lastChapter) {
                if (i + 1 < chapters.length) {
                    nextChapter = chapters[i + 1];
                }
                break;
            }
        }
        if (!nextChapter) {
            alert("No next chapter");
            GUI.loader.remove(id);
            return;
        }
        book.lastChapter = nextChapter.chapterId;
        this.database.setBook(book.bookId, book.name, book.content, book.url, book.lastChapter);
        GUI.showBook(nextChapter.url, nextChapter.content, nextChapter.title, nextChapter.options, book.bookId, nextChapter.chapterId);
        GUI.loader.remove(id);
    }
    async beforeChapter() {
        var id = GUI.loader.add("Loading next chapter");
        var book = await CONTROLLER.database.getBook(GUI.currentBookId);
        if (!book) {
            alert('Error');
            GUI.loader.remove(id);
            return;
        }
        var chapters = await CONTROLLER.database.getChapters(book.bookId);
        chapters = CONTROLLER.database.sortByChapterId(chapters);
        var nextChapter = null;
        for (var i = 0; i < chapters.length; i++) {
            if (chapters[i].chapterId == book.lastChapter) {
                if (i - 1 >= 0) {
                    nextChapter = chapters[i - 1];
                }
                break;
            }
        }

        if (!nextChapter) {
            alert("No chapter before");
            GUI.loader.remove(id);
            return;
        }
        book.lastChapter = nextChapter.chapterId;
        CONTROLLER.database.setBook(book.bookId, book.name, book.content, book.url, book.lastChapter);
        GUI.showBook(nextChapter.url, nextChapter.content, nextChapter.title, nextChapter.options, book.bookId, nextChapter.chapterId);

        GUI.loader.remove(id);
    }


    async showBookChapters(bookid) {
        var id = GUI.loader.add("Loading book " + bookid);
        var book = await this.database.getBook(bookid);
        if (!book) {
            alert('Error');
            GUI.loader.remove(id);
            return;
        }

        GUI.showBook(book.url, book.content, book.name, book.options, bookid, null);
        GUI.loader.remove(id);
    }


    async reloadPage() {
        var id = GUI.loader.add("Reloading page");

        if (GUI.currentPageType == "book") {
            if (GUI.currentChapterId) {
                this.showBook(GUI.currentBookId);
            } else {
                this.showBookChapters(GUI.currentBookId);
            }
        } else {
            var page = await this.database.getPage(GUI.currentPage);
            GUI.showPage(page.url, page.content, page.title, page.options);
        }
        GUI.loader.remove(id);
    }

    async pageClicked(url) {
        GUI.pageReader.optionsOpen = false;
        GUI.pageReader.updateOptions();
        if (GUI.currentPageType == "book") {
            const chapterId = await this.database.getBookChapterIdFromUrl(GUI.currentBookId, url);
            if (chapterId != null) {
                this.showBook(GUI.currentBookId, chapterId);
                return;
            }
        } else if (GUI.currentPageType == "page") {
            const downloadedPage = await this.database.getPage(url);
            if (downloadedPage != null) {
                this.showPage(url);
                return;
            }
        }
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
                        var isBook = await CONTROLLER.getPage(url);
                        //[isBook, type: chapter|book, bookid, chapter, {options}]
                        if (isBook[0]) {
                            if (isBook[1] == "chapter") {
                                CONTROLLER.showBook(isBook[2], isBook[3]);
                                return;
                            }
                            CONTROLLER.showBook(isBook[2]);
                            return;
                        }
                        CONTROLLER.showPage(url);
                    }
                }
            ]
        })
    }

    clearServiceWorkerCache() {
        var promise = new Promise((resolve, reject) => {
            var id = GUI.loader.add("Clearing service worker cache");
            //send a message to the service worker to clear the cache
            var messageChannel = new MessageChannel();
            messageChannel.port1.onmessage = function (event) {
                if (event.data.command == 'clearCache' && event.data.status == "success") {
                    console.log('Cache cleared');
                }
            };
            navigator.serviceWorker.controller.postMessage({ command: 'clearCache' }, [messageChannel.port2]);

            GUI.loader.remove(id);
            resolve();
        });
        return promise;
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

console.log("Loaded");