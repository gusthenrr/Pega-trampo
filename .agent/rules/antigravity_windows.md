# Antigravity Environment Rules - Windows PowerShell or Cursor Enviroment Rules

<!-- 
ESTE ARQUIVO É DESTINADO EXCLUSIVAMENTE AO AGENTE ANTIGRAVITY.
ELE DEFINE AS PREFERÊNCIAS DE AMBIENTE PARA GARANTIR COMPATIBILIDADE E EFICIÊNCIA.
-->

## Diretrizes de Execução

1. **Shell:** Utilizar sempre **PowerShell**.
2. **Busca de Arquivos:** 
   - **NUNCA** utilizar `grep`.
   - Utilizar exclusivamente **ripgrep (`rg`)** para todas as buscas de conteúdo em arquivos.
3. **Caminhos de Arquivo (Paths):**
   - Utilizar sempre o formato de caminho absoluto do Windows: `C:\...`
   - **Sempre** envolver caminhos em aspas duplas, por exemplo: `"C:\dev_pega_trampo\pega-trampo\app\page.tsx"`.
4. **Comandos de Terminal:**
   - Priorizar comandos nativos do PowerShell ou utilitários modernos instalados (como `rg`, `fd`).
5. **Limpeza de Arquivos (Cleanup):**
   - Ao criar arquivos temporários para testes ou depuração (ex: scripts `.py` de teste), estes **devem ser apagados** assim que o teste for validado e concluído, para manter o diretório limpo.

---
*Nota: Estas instruções devem ser lidas e seguidas por qualquer instância do Antigravity operando neste repositório.*
