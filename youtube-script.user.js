// ==UserScript==
// @name         Youtube Subs Input Search
// @run-at       document-start
// @namespace    http://tampermonkey.net/
// @match        https://www.youtube.com/*
// @author       Naboum
// @version      2.0
// @updateURL    https://github.com/Naboum/Youtube-Subscription-Input-Search/raw/main/youtube-script.user.js
// @downloadURL  https://github.com/Naboum/Youtube-Subscription-Input-Search/raw/main/youtube-script.user.js
// @resource     youtubeCSS https://raw.githubusercontent.com/Naboum/Youtube-Subscription-Input-Search/main/youtube.css
// @require      https://raw.githubusercontent.com/Naboum/Youtube-Subscription-Input-Search/refs/heads/main/csp_fix.js
// @icon         https://www.google.com/s2/favicons?sz=64&domain=youtube.com
// @grant        GM_addStyle
// @grant        GM_getResourceText
// @grant        GM_getResourceURL
// ==/UserScript==

(function () {
    "use strict";

    // Remplace waitForKeyElements.js
    function waitForElement(selector, callback) {
        const el = document.querySelector(selector);
        if (el) return callback(el);

        const observer = new MutationObserver(() => {
            const el = document.querySelector(selector);
            if (el) {
                observer.disconnect();
                callback(el);
            }
        });

        // Vérifier que document.body existe avant d'observer
        if (document.body) {
            observer.observe(document.body, { childList: true, subtree: true });
        } else {
            // Attendre que le body soit disponible
            document.addEventListener('DOMContentLoaded', function () {
                observer.observe(document.body, { childList: true, subtree: true });
            });
        }
    }

    // Ajout style perso
    document.head.insertAdjacentHTML("beforeend", `<link rel="stylesheet" href="${GM_getResourceURL("youtubeCSS")}">`);

    // Expand la liste des abonnés automatiquement
    waitForElement("ytd-guide-entry-renderer#expander-item.style-scope.ytd-guide-collapsible-entry-renderer", el => {
        el.click();
    });

    // Ajout barre de recherche pour les abonnements et logique autocomplete
    waitForElement("#sections > ytd-guide-section-renderer:nth-child(2)", el => {
        //console.log("Section abonnements trouvée :", el);

        // Ajout du champ input en haut de la section
        el.insertAdjacentHTML("afterbegin", `
    <div id="input-container">
        <span class="input-icon"></span>
        <input id="input-subs-autocomplete" tabindex="-1" type="text" placeholder="Rechercher"
            autocapitalize="none" autocomplete="off" autocorrect="off" spellcheck="false">
        <span id="clear-search" class="clear-search-svg" style="display: none;">
            <svg focusable="false" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"></path>
            </svg>
        </span>
    </div>
            `);

        // Recupère tous les abonnements
        const sub_container = el.querySelector("#items");
        const direct_subs = Array.from(sub_container.querySelectorAll("ytd-guide-entry-renderer"));
        const expanded_subs = Array.from(sub_container.querySelectorAll("ytd-guide-collapsible-entry-renderer > #expanded > #expandable-items > ytd-guide-entry-renderer:not(:last-child)"));
        const all_subs = direct_subs.concat(expanded_subs);

        // Crée une map, associe les noms d'abonnements à l'élément DOM
        const sub_map = new Map();
        const endpoint_selector = "#endpoint";

        all_subs.forEach(element => {
            const endpoint = element.querySelector(endpoint_selector);
            const sub_name = endpoint.getAttribute("title");
            const channel_id = endpoint.href.split('/').pop(); // ID unique de la chaîne
            const unique_key = `${sub_name}_${channel_id}`; // Clé unique : nom + ID (pour gèrer les abos avec même noms de chaines)
            sub_map.set(unique_key, element);
        });

        // Préparation autocomplete
        const normalized_map = new Map();
        const normalize_string = str => str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

        sub_map.forEach((element, unique_key) => {
            const name_part = unique_key.split('_')[0]; // Prend "NomChaîne" sans l'ID
            const normalized_key = normalize_string(unique_key);

            // Pré-gestion des images qui ne s'affichaient pas, pas sûr d'en avoir toujours besoin
            const img_parent = element.querySelector("yt-img-shadow");
            const img_element = element.querySelector("#img");
            if (img_element && !img_element.getAttribute("src")) {
                img_element.addEventListener("error", () => img_element.setAttribute("src", ""));
            }

            normalized_map.set(normalized_key, {
                element,
                original_key: unique_key, // NomChaîne_12xyz34
                original_name: name_part, // NomChaîne
                img_parent,
                img_element,
                is_empty: img_parent?.classList.contains("empty") || false
            });
        });

        // Tout est prêt, on écoute maintenant
        const input = document.querySelector("#input-subs-autocomplete");
        const clear_btn = document.querySelector("#clear-search");
        let search_timeout;
        input.addEventListener("input", () => {
            clearTimeout(search_timeout);
            search_timeout = setTimeout(() => { // Délai ms pour éviter de relancer tout le code à chaque fois (debounce)
                clear_btn.style.display = input.value ? "flex" : "none"; // affiche ou cache le bouton clear
                const query = normalize_string(input.value);
                normalized_map.forEach((data, normalized_key) => {
                    const is_visible = normalized_key.includes(query);
                    data.element.style.display = is_visible ? "" : "none";
                });
            }, 150);
        });

        // Efface la recherche
        clear_btn.addEventListener("click", () => {
            input.value = "";
            input.focus();
            clear_btn.style.display = "none";

            // Réaffiche tous les abonnements
            normalized_map.forEach(data => {
                data.element.style.display = "";
            });
        });

        // Focus automatique et gestion du clic
        input.addEventListener("click", (e) => e.stopPropagation());
        setTimeout(() => input.focus(), 500);
    });
})();
