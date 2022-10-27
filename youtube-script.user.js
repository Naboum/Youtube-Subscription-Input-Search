// ==UserScript==
// @name         Youtube-Subscription-Input-Search
// @namespace    http://tampermonkey.net/
// @match        https://www.youtube.com/*
// @author       Naboum
// @version      1.4
// @updateURL    https://github.com/Naboum/Youtube-Subscription-Input-Search/raw/main/youtube-script.user.js
// @downloadURL  https://github.com/Naboum/Youtube-Subscription-Input-Search/raw/main/youtube-script.user.js
// @resource     youtubeCSS https://raw.githubusercontent.com/Naboum/Youtube-Subscription-Input-Search/main/youtube.css
// @require      https://gist.github.com/raw/2625891/waitForKeyElements.js
// @require      http://ajax.googleapis.com/ajax/libs/jquery/1.9.1/jquery.min.js
// @require      https://cdnjs.cloudflare.com/ajax/libs/jquery-cookie/1.4.1/jquery.cookie.min.js
// @require      https://code.jquery.com/ui/1.12.1/jquery-ui.js
// @grant        GM_addStyle
// @grant        GM_getResourceText
// @grant        GM_getResourceURL
// ==/UserScript==

function addCssElement(url) {
    var link = document.createElement("link");
    link.href = url;
    link.rel = "stylesheet";
    link.type = "text/css";
    document.head.appendChild(link);
}

$(document).ready(function () {
    console.log("start");
    addCssElement(GM_getResourceURL("youtubeCSS"));

    var currentState = getFirstState();

    waitForKeyElements("ytd-guide-entry-renderer#expander-item.style-scope.ytd-guide-collapsible-entry-renderer", clickMore);
    waitForKeyElements("div#create.style-scope.ytd-comments-header-renderer", manageFirstMargin);
    waitForKeyElements("#sections > ytd-guide-section-renderer:nth-child(2) > h3", subscribingsListReady);

    $("button.ytp-size-button.ytp-button").click(function () {
        manageMargin(currentState);
        if (currentState === "1") currentState = "0";
        else if (currentState === "0") currentState = "1";
    });

    $("#guide-button").click(function () {
        if ($("app-drawer#guide")[0].hasAttribute("opened")) {
            setTimeout(function () {
                $("#input-subs-autocomplete").focus();
            }, 50);
        }
    });

    function getFirstState() {
        var firstState = $.cookie("wide");
        if (typeof firstState === "undefined") {
            var buttonText = $("button.ytp-size-button.ytp-button").attr("title");
            if (buttonText === "Mode cinéma") return "0";
            else return "1";
        }
        else return firstState;
    }

    function manageFirstMargin() {
        if (currentState === "0") $("div#create.style-scope.ytd-comments-header-renderer").css("margin-right", "0px");
        else if (currentState === "1") $("div#create.style-scope.ytd-comments-header-renderer").css("margin-right", "22px");
    }

    function manageMargin(currentState) {
        if (currentState === "1") $("div#create.style-scope.ytd-comments-header-renderer").css("margin-right", "0px");
        else if (currentState === "0") $("div#create.style-scope.ytd-comments-header-renderer").css("margin-right", "22px");
        else console.log("CUCKED");
    }

    function clickMore(jNode) {
        jNode.click();
    }

    $("#endpoint.yt-simple-endpoint.style-scope.ytd-guide-entry-renderer").mouseup(function (e) {
        switch (e.which) {
            case 1: //left click
            case 2: //middle click
                $("#input-subs-autocomplete").val('').trigger('change');
                break;
            case 3: //right Click
                break;
        }
    });

    function subscribingsListReady() {
        $("#sections > ytd-guide-section-renderer:nth-child(2) > h3").append(`
<class id="input-container">
<span class="input-icon"></span>
<input id="input-subs-autocomplete" tabindex="-1" type="search" placeholder="Search">
</class>`);
        var subContainer = $("#sections > ytd-guide-section-renderer:nth-child(2) > #items");

        var subList = {};
        var arr1 = subContainer.children("ytd-guide-entry-renderer");
        var arr2 = subContainer.find("ytd-guide-collapsible-entry-renderer > #expanded > #expandable-items > ytd-guide-entry-renderer:not(:last-child)");
        var arr3 = $.merge(arr1, arr2);

        $.each(arr3, function (key, value) {
            var subName = $(value).find("#endpoint").attr("title");
            subList[subName] = $(value);
        });

        $("#input-subs-autocomplete").on("change paste keyup search", function () {
            var currentInputValue = $(this).val();
            currentInputValue = currentInputValue.normalize('NFD').replace(/[\u0300-\u036f]/g, "").toLowerCase();

            $.each(subList, function (key, value) {
                var sanitizedSubName = key.normalize('NFD').replace(/[\u0300-\u036f]/g, "").toLowerCase();
                var imgParent = $(value).find("yt-img-shadow");
                var imgElement = $(value).find("#img");
                $(value)[sanitizedSubName.indexOf(currentInputValue) > -1 ? 'show' : 'hide']();

                if ($(value).is(":visible")) {
                    if ($(imgParent).hasClass("empty")) {
                        $(imgParent).removeClass("empty");
                    }
                    if ($(imgElement).attr("src") == null) {
                        $(imgElement).error(function () {
                            $(imgElement).attr("src", "");
                        }).attr("src", "");
                    }
                }
            });
        });
    }
});
