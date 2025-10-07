// ==UserScript==
// @name         SakuraMangas Auto Downloader
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Adiciona botão "Download" para baixar capítulos completos do SakuraMangas em ZIP automaticamente
// @author       Etoshy
// @match        https://sakuramangas.org/obras/*/*/
// @icon         https://sakuramangas.org/favicon.ico
// @grant        none
// @require      https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js
// @require      https://cdnjs.cloudflare.com/ajax/libs/FileSaver.js/2.0.5/FileSaver.min.js
// ==/UserScript==

(function() {
    'use strict';

    // Função auxiliar: espera elemento aparecer
    function waitForElement(selector, callback) {
        const el = document.querySelector(selector);
        if (el) return callback(el);
        const obs = new MutationObserver(() => {
            const node = document.querySelector(selector);
            if (node) {
                obs.disconnect();
                callback(node);
            }
        });
        obs.observe(document.body, { childList: true, subtree: true });
    }

    // Função para rolar até o fim real da página
    async function scrollToEnd() {
        console.log("🌀 Rolando até o final da página...");
        let lastHeight = 0;
        let sameCount = 0;

        while (sameCount < 3) { // confirma que realmente parou de carregar
            window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
            await new Promise(r => setTimeout(r, 1000));
            const newHeight = document.body.scrollHeight;
            if (newHeight === lastHeight) sameCount++;
            else sameCount = 0;
            lastHeight = newHeight;
        }

        console.log("✅ Fim da página atingido.");
    }

    waitForElement("#select-cap", (select) => {
        // Cria botão Download
        const btn = document.createElement("button");
        btn.textContent = "Download";
        btn.style.marginLeft = "10px";
        btn.style.padding = "6px 14px";
        btn.style.border = "none";
        btn.style.borderRadius = "6px";
        btn.style.background = "rgb(255, 160, 226)";
        btn.style.color = "white";
        btn.style.cursor = "pointer";
        btn.style.fontWeight = "bold";
        btn.style.transition = "all 0.3s";

        btn.onmouseenter = () => btn.style.opacity = "0.8";
        btn.onmouseleave = () => btn.style.opacity = "1";

        select.parentElement.appendChild(btn);

        btn.addEventListener("click", async () => {
            btn.textContent = "Carregando páginas...";
            btn.disabled = true;

            // Rola até o fim real
            await scrollToEnd();

            // Espera 2 segundos
            await new Promise(r => setTimeout(r, 2000));

            // Sobe pro topo
            window.scrollTo({ top: 0, behavior: "smooth" });

            btn.textContent = "Baixando imagens...";

            // Pega imagens carregadas da rede
            const imgs = performance.getEntriesByType("resource")
                .map(e => e.name)
                .filter(u => u.startsWith("https://sakuramangas.org/imagens/") && u.endsWith(".jpg"));

            const unique = [...new Set(imgs)];
            console.log("🖼️ Imagens encontradas:", unique.length);

            // Nome da obra e capítulo
            const titulo = document.querySelector("#id-titulo")?.innerText
                ?.replace(/^\s*←\s*/, "")
                ?.trim() || "manga";
            const match = window.location.pathname.match(/\/(\d+)\/?$/);
            const cap = match ? match[1] : "000";
            const zipName = `${titulo}-${cap}.zip`;

            const zip = new JSZip();
            let count = 1;

            for (const url of unique) {
                try {
                    const res = await fetch(url);
                    const blob = await res.blob();
                    const filename = `pagina_${String(count).padStart(3, "0")}.jpg`;
                    zip.file(filename, blob);
                    console.log(`📥 ${filename}`);
                    count++;
                    await new Promise(r => setTimeout(r, 150));
                } catch (err) {
                    console.warn("Erro ao baixar:", url, err);
                }
            }

            btn.textContent = "Compactando ZIP...";

            const content = await zip.generateAsync({ type: "blob" });
            saveAs(content, zipName);

            btn.textContent = "Concluído!";
            setTimeout(() => {
                btn.textContent = "Download";
                btn.disabled = false;
            }, 3000);
        });
    });
})();
