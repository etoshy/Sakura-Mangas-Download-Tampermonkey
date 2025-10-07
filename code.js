// ==UserScript==
// @name         SakuraMangas Auto Downloader
// @namespace    http://tampermonkey.net/
// @version      2.0
// @description  Adiciona botão "Download". Usa rolagem controlada para carregar e depois baixa as URLs reais.
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

    /**
     * Rola a página UMA IMAGEM POR VEZ. O objetivo aqui é fazer o navegador
     * carregar as imagens na página de forma controlada, sem causar erros 429.
     */
    async function triggerImageLoading(btn) {
        console.log("🦾 Iniciando rolagem controlada para carregar as imagens na página...");
        let i = 0;
        let endCheckCount = 0;

        while (true) {
            const pages = document.querySelectorAll('.pag-item');
            if (i < pages.length) {
                const currentPage = pages[i];
                endCheckCount = 0;
                const totalPagesEstimate = pages.length > i ? pages.length : i + 1;
                btn.textContent = `Carregando ${i + 1}/${totalPagesEstimate}...`;
                currentPage.scrollIntoView({ behavior: 'smooth', block: 'center' });
                await new Promise(r => setTimeout(r, 500)); // Pausa para garantir carregamento
                i++;
            } else {
                endCheckCount++;
                if (endCheckCount >= 3) break;
                await new Promise(r => setTimeout(r, 1000));
            }
        }
        console.log(`✅ Todas as ${i} imagens foram carregadas na página.`);
        window.scrollTo({ top: 0, behavior: "smooth" });
        await new Promise(r => setTimeout(r, 500));
    }

    waitForElement("#select-cap", (select) => {
        const btn = document.createElement("button");
        btn.textContent = "Download";
        btn.style.cssText = "margin-left: 10px; padding: 6px 14px; border: none; border-radius: 6px; background: rgb(255, 160, 226); color: white; cursor: pointer; font-weight: bold; transition: all 0.3s;";
        btn.onmouseenter = () => !btn.disabled && (btn.style.opacity = "0.8");
        btn.onmouseleave = () => btn.style.opacity = "1";
        select.parentElement.appendChild(btn);

        btn.addEventListener("click", async () => {
            btn.disabled = true;
            btn.style.cursor = "default";
            btn.style.opacity = "0.7";

            // PASSO 1: Usar a rolagem lenta para carregar tudo na página sem erros.
            await triggerImageLoading(btn);

            btn.textContent = "Coletando URLs...";
            await new Promise(r => setTimeout(r, 1000)); // Pequena pausa

            // PASSO 2: Pegar as URLs reais da rede, como no seu script.
            const imageUrls = performance.getEntriesByType("resource")
                .map(e => e.name)
                .filter(u => u.startsWith("https://sakuramangas.org/imagens/") && (u.endsWith(".jpg") || u.endsWith(".png")));

            let uniqueUrls = [...new Set(imageUrls)];

            // PASSO 2.5: Ordenar as URLs numericamente, pois elas podem vir fora de ordem.
            const getPageNumber = (url) => {
                const match = url.match(/\/(\d+)\.(jpg|png)$/);
                return match ? parseInt(match[1], 10) : 0;
            };
            uniqueUrls.sort((a, b) => getPageNumber(a) - getPageNumber(b));

            console.log(`🖼️ URLs reais encontradas e ordenadas: ${uniqueUrls.length}`);

            if (uniqueUrls.length === 0) {
                 btn.textContent = "Nenhuma imagem!";
                 setTimeout(() => {
                    btn.textContent = "Download";
                    btn.disabled = false;
                    btn.style.cursor = "pointer";
                    btn.style.opacity = "1";
                }, 3000);
                return;
            }

            const titulo = document.querySelector("#id-titulo")?.innerText?.replace(/^\s*←\s*/, "")?.trim() || "manga";
            const capMatch = window.location.pathname.match(/\/(\d+)\/?$/);
            const cap = capMatch ? capMatch[1] : "000";
            const zipName = `${titulo}-${cap}.zip`;

            const zip = new JSZip();
            const total = uniqueUrls.length;

            // PASSO 3: Baixar as URLs reais, uma por uma, com uma pausa generosa.
            for (let i = 0; i < total; i++) {
                const url = uniqueUrls[i];
                btn.textContent = `Baixando ${i + 1}/${total}...`;
                try {
                    const res = await fetch(url);
                    if (!res.ok) throw new Error(`Falha no fetch: ${res.status}`);
                    const blob = await res.blob();
                    const filename = `pagina_${String(i + 1).padStart(3, "0")}.jpg`;
                    zip.file(filename, blob);
                    console.log(`📥 ${filename} (de ${url})`);
                    // PAUSA CRÍTICA PARA EVITAR ERRO 429
                    await new Promise(r => setTimeout(r, 300));
                } catch (err) {
                    console.warn("Erro ao baixar:", url, err);
                }
            }

            btn.textContent = "Compactando ZIP...";
            const content = await zip.generateAsync({ type: "blob" }, (metadata) => {
                 btn.textContent = `Compactando ${Math.floor(metadata.percent)}%`;
            });
            saveAs(content, zipName);

            btn.textContent = "Concluído!";
            setTimeout(() => {
                btn.textContent = "Download";
                btn.disabled = false;
                btn.style.cursor = "pointer";
                btn.style.opacity = "1";
            }, 3000);
        });
    });
})();
