// ==UserScript==
// @name         SakuraMangas Auto Downloader
// @namespace    http://tampermonkey.net/
// @version      2.2
// @description  Adiciona botão "Download". Intercepta e armazena as imagens enquanto são carregadas.
// @author       Etoshy
// @match        https://sakuramangas.org/obras/*/*/
// @icon         https://sakuramangas.org/favicon.ico
// @grant        none
// @require      https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js
// @require      https://cdnjs.cloudflare.com/ajax/libs/FileSaver.js/2.0.5/FileSaver.min.js
// ==/UserScript==

(function() {
    'use strict';

    // Armazena as imagens capturadas
    const capturedImages = [];
    let isCapturing = false;

    // Intercepta a criação de URLs blob
    const originalCreateObjectURL = URL.createObjectURL;
    URL.createObjectURL = function(blob) {
        const blobUrl = originalCreateObjectURL.call(this, blob);

        // Se estamos capturando e é uma imagem, armazena
        if (isCapturing && blob.type && blob.type.startsWith('image/')) {
            console.log(`📸 Imagem capturada: ${blob.type}, ${blob.size} bytes`);
            capturedImages.push({
                blob: blob,
                url: blobUrl
            });
        }

        return blobUrl;
    };

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
     * Rola a página UMA IMAGEM POR VEZ para carregar as imagens na página.
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
                btn.textContent = `Carregando ${i + 1}/${totalPagesEstimate}... (${capturedImages.length} imgs)`;
                currentPage.scrollIntoView({ behavior: 'smooth', block: 'center' });
                await new Promise(r => setTimeout(r, 1000)); // Pausa para garantir carregamento
                i++;
            } else {
                endCheckCount++;
                if (endCheckCount >= 3) break;
                await new Promise(r => setTimeout(r, 1000));
            }
        }
        console.log(`✅ Todas as ${i} imagens foram carregadas. Total capturado: ${capturedImages.length}`);
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

            // Limpa capturas anteriores e inicia captura
            capturedImages.length = 0;
            isCapturing = true;

            // PASSO 1: Rolar a página para carregar todas as imagens
            await triggerImageLoading(btn);

            // Para de capturar
            isCapturing = false;

            btn.textContent = "Processando imagens...";
            await new Promise(r => setTimeout(r, 500));

            console.log(`🖼️ Total de imagens capturadas: ${capturedImages.length}`);

            if (capturedImages.length === 0) {
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
            const total = capturedImages.length;

            // PASSO 2: Adicionar todas as imagens capturadas ao ZIP
            for (let i = 0; i < total; i++) {
                btn.textContent = `Adicionando ${i + 1}/${total}...`;
                try {
                    const imgData = capturedImages[i];
                    const extension = imgData.blob.type.split('/')[1] || 'jpg';
                    const filename = `pagina_${String(i + 1).padStart(3, "0")}.${extension}`;
                    zip.file(filename, imgData.blob);
                    console.log(`📥 ${filename} adicionado (${imgData.blob.size} bytes)`);
                } catch (err) {
                    console.warn("Erro ao adicionar imagem:", err);
                }
            }

            btn.textContent = "Compactando ZIP...";
            const content = await zip.generateAsync({ type: "blob" }, (metadata) => {
                btn.textContent = `Compactando ${Math.floor(metadata.percent)}%`;
            });

            // Tenta usar saveAs, se falhar usa método manual
            try {
                saveAs(content, zipName);
                console.log(`💾 ZIP salvo via saveAs: ${zipName}`);
            } catch (err) {
                console.warn("saveAs falhou, tentando método manual:", err);
                // Método manual de download
                const url = URL.createObjectURL(content);
                const a = document.createElement('a');
                a.href = url;
                a.download = zipName;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
                console.log(`💾 ZIP salvo via método manual: ${zipName}`);
            }

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
