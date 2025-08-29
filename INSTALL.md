# 🚀 Guia de Instalação - Bug Inspector

## Pré-requisitos

- **Node.js** ≥ 20 (recomendado 20 LTS)
- **npm** (incluído com Node.js)
- **Google Chrome** ou **Microsoft Edge** (Chromium)
- **Sistema operacional**: Windows, macOS ou Linux

## 📦 Instalação Rápida

### 1. Clonar/Baixar o Projeto

```bash
# Se usando Git
git clone <repository-url> bug-inspector
cd bug-inspector

# Ou extrair o arquivo ZIP fornecido
```

### 2. Instalar Dependências do Servidor

```bash
cd server
npm install
```

### 3. Instalar Dependências da Extensão

```bash
cd ../extension
npm install
```

### 4. Construir a Extensão

```bash
npm run build
```

## 🖥️ Configuração do Servidor

### Iniciar o Servidor

```bash
cd server
npm run dev
```

**Saída esperada:**
```
🐛 Bug Inspector Server
📡 Servidor rodando em: http://0.0.0.0:8787
📁 Storage: /path/to/bug-inspector/server/storage
🔗 Endpoints:
   - POST /api/upload (upload de arquivos)
   - GET  /files (listar arquivos)
   - GET  /view/:filename (visualizar)
   - GET  /download/:filename (download)
   - GET  /health (status)
```

### Verificar Funcionamento

Abra no navegador: `http://localhost:8787/health`

**Resposta esperada:**
```json
{
  "status": "ok",
  "timestamp": "2025-08-29T11:35:31.125Z",
  "storage": "/path/to/storage"
}
```

## 🔧 Instalação da Extensão Chrome

### 1. Abrir Gerenciador de Extensões

1. Abra o Google Chrome
2. Digite na barra de endereços: `chrome://extensions/`
3. Pressione Enter

### 2. Ativar Modo Desenvolvedor

1. No canto superior direito, ative o botão **"Modo desenvolvedor"**
2. Novos botões aparecerão na página

### 3. Carregar a Extensão

1. Clique em **"Carregar sem compactar"**
2. Navegue até a pasta do projeto
3. Selecione a pasta `extension/dist`
4. Clique em **"Selecionar pasta"**

### 4. Verificar Instalação

A extensão deve aparecer na lista com:
- **Nome**: Bug Inspector
- **ID**: (gerado automaticamente)
- **Status**: Ativada

## ⚙️ Configuração da Extensão

### 1. Acessar Popup da Extensão

1. Clique no ícone da extensão na barra de ferramentas
2. Se não estiver visível, clique no ícone de quebra-cabeça (extensões)

### 2. Configurar Endpoint

1. No campo **"Endpoint do Servidor"**, insira:
   ```
   http://localhost:8787/api/upload
   ```
2. Clique em **"Salvar Configuração"**

### 3. Testar Conexão

1. Clique em **"Testar Conexão"**
2. Deve aparecer: **"Conexão OK! Servidor funcionando"**

## 🎬 Primeiro Uso

### 1. Mostrar Overlay

1. Clique em **"Mostrar/Ocultar Overlay"** no popup
2. Um overlay deve aparecer no canto superior direito da página

### 2. Testar Gravação

1. No overlay, clique em **"Gravar"**
2. Permita o acesso à tela quando solicitado
3. Selecione a aba/janela para gravar
4. Clique em **"Parar"** após alguns segundos

### 3. Verificar Arquivo Salvo

1. Clique em **"Ver Arquivos Salvos"** no popup
2. Uma nova aba abrirá mostrando os arquivos
3. Clique em um arquivo para visualizar

## 🔍 Solução de Problemas

### Servidor Não Inicia

**Erro**: `EADDRINUSE: address already in use 0.0.0.0:8787`

**Solução**:
```bash
# Encontrar processo usando a porta
lsof -ti:8787

# Matar o processo (substitua XXXX pelo PID)
kill XXXX

# Ou usar porta diferente
PORT=8788 npm run dev
```

### Extensão Não Carrega

**Problema**: Erro ao carregar extensão

**Soluções**:
1. Verificar se a pasta `extension/dist` existe
2. Executar `npm run build` novamente
3. Verificar se todos os arquivos estão presentes:
   ```bash
   ls extension/dist/
   # Deve mostrar: manifest.json, sw.js, content.js, etc.
   ```

### Permissões de Gravação

**Problema**: Não consegue gravar tela

**Soluções**:
1. Verificar se o Chrome tem permissão para capturar tela
2. Tentar em uma aba diferente
3. Recarregar a extensão em `chrome://extensions/`

### Upload Falha

**Problema**: Arquivos não são salvos

**Soluções**:
1. Verificar se o servidor está rodando
2. Confirmar endpoint configurado corretamente
3. Verificar logs do servidor no terminal
4. Testar endpoint manualmente:
   ```bash
   curl http://localhost:8787/health
   ```

## 📋 Checklist de Instalação

- [ ] Node.js ≥ 20 instalado
- [ ] Dependências do servidor instaladas (`npm install`)
- [ ] Dependências da extensão instaladas (`npm install`)
- [ ] Extensão construída (`npm run build`)
- [ ] Servidor iniciado (`npm run dev`)
- [ ] Health check funcionando (`http://localhost:8787/health`)
- [ ] Extensão carregada no Chrome
- [ ] Endpoint configurado na extensão
- [ ] Teste de conexão bem-sucedido
- [ ] Primeiro teste de gravação realizado

## 🎯 Próximos Passos

Após a instalação bem-sucedida:

1. **Explore as funcionalidades**:
   - Teste gravação e replay
   - Experimente o editor de vídeo
   - Use os atalhos de teclado

2. **Configure para produção** (opcional):
   - Altere a porta do servidor
   - Configure HTTPS
   - Ajuste configurações de CORS

3. **Execute os testes**:
   ```bash
   cd server
   npm test
   ```

## 📞 Suporte

Se encontrar problemas durante a instalação:

1. Verifique os logs do servidor no terminal
2. Abra as ferramentas de desenvolvedor do Chrome (F12)
3. Verifique a aba Console por erros
4. Confirme que todas as dependências foram instaladas

**Logs importantes**:
- Servidor: Terminal onde executou `npm run dev`
- Extensão: Console do Chrome (F12 → Console)
- Service Worker: `chrome://extensions/` → Detalhes da extensão → Inspecionar views

