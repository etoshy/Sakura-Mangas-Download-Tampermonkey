# Sakura-Mangas-Download-Tampermonkey
Extensão Tampermonkey para baixar capítulos completos do site SakuraMangas.org em formato ZIP

## Pré-requisitos

- Navegador com suporte a extensões (Chrome, Edge, Firefox, Brave, etc)
- [Tampermonkey](https://tampermonkey.net/) instalado

---

## Instalação

1. Abra o **Tampermonkey** no seu navegador  
2. Clique em **Criar novo script**
3. Apague o conteúdo e cole o código de [`code.js`](./code.js)
4. Clique em **Salvar (Ctrl+S)**

---

## 🪄 Como usar

1. Acesse qualquer capítulo, por exemplo:  
 `https://sakuramangas.org/obras/uchi-no-musuko-wa-tabun-gay/72/`
2. Espere o seletor de capítulos carregar  
3. Clique no botão **Download** ao lado  
4. O script vai:
 - Rolar até o fim da página  
 - Esperar as imagens carregarem  
 - Subir novamente  
 - Criar e baixar um `.zip` com todas as páginas

---

## Detalhes técnicos

- Linguagem: **JavaScript (UserScript/Tampermonkey)**
- Bibliotecas:
- [JSZip](https://stuk.github.io/jszip/) — para criar o arquivo ZIP  
- [FileSaver.js](https://github.com/eligrey/FileSaver.js/) — para salvar o arquivo no navegador  
- Cor do botão: `rgb(255, 160, 226)`

---

## Licença

Este projeto é distribuído sob a licença **MIT**.  
Você pode usar, modificar e distribuir livremente, desde que mantenha os créditos.

---

### Autor

Desenvolvido com o apoio do Etoshy para automatizar o download de capítulos do SakuraMangas.
