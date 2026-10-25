# 🌿 Casa em Paz — Guia Completo do Casal

Bem-vindo ao **Casa em Paz**! Este aplicativo foi desenvolvido exclusivamente para organizar as tarefas da casa de vocês (2 quartos, sala, cozinha, quintal com plantas e os gatinhos), garantindo uma divisão justa e saudável, **eliminando sobrecargas** e fortalecendo a parceria do casal com leveza e carinho.

---

## 📱 Sumário
1. [Como Funciona o Aplicativo](#1-como-funciona-o-aplicativo)
2. [Como Você e a Kassandra Entram no Mesmo Casal](#2-como-você-e-a-kassandra-entram-no-mesmo-casal)
3. [Como Rodar no seu Computador ou no Celular via Wi-Fi](#3-como-rodar-no-seu-computador-ou-no-celular-via-wi-fi)
4. [Passo a Passo Simples: Banco Online Gratuito (Firebase)](#4-passo-a-passo-simples-banco-online-gratuito-firebase)
5. [Passo a Passo Simples: Publicar na Internet e Gerar o APK Android](#5-passo-a-passo-simples-publicar-na-internet-e-gerar-o-apk-android)
6. [Detalhes do Algoritmo Anti-Sobrecarga](#6-detalhes-do-algoritmo-anti-sobrecarga)

---

## 1. Como Funciona o Aplicativo

O app possui 7 telas ergonômicas desenhadas para uso fácil com uma mão no celular:

* **☀️ Hoje**: Lista tudo o que deve ser feito no dia.
  - Botão grande de **CONCLUIR TAREFA** com chuva de confetes e mensagem amorosa de incentivo.
  - Ações sem culpa: **Passar com carinho para o parceiro**, **Adiar para amanhã** ou **Propor troca**.
* **📅 Semana**: Cronograma interativo dos 7 dias da semana com botão **"Reorganizar"**, que recalcula tudo automaticamente.
* **⚖️ Equilíbrio**: Gráfico semanal e mensal de esforço (tempo × cansaço) e minutos dedicados, com mensagem amigável sem cobranças.
* **📋 Tarefas**: Todas as tarefas cadastradas (gatos, plantas, cozinha, banheiro, roupas à mão). Permite adicionar novas, editar minutos, desgaste (Leve, Médio, Pesado) e marcar quem se sobrecarrega.
* **⏰ Horários (Disponibilidade)**: Botões rápidos de 1 toque: *Dia Corrido* (30 min livres), *Dia Normal* (2h livres) ou *Folga* (5h livres), além de turnos (Manhã, Tarde, Noite).
* **🔄 Trocas**: Central de apoio mútuo onde um pode pedir ajuda e o outro pode aceitar com carinho ou adiar.
* **⚙️ Ajustes**: Código do casal, nomes, meta de divisão (50/50), modo claro/escuro, teste de notificação sonora e conexão Firebase.

---

## 2. Como Você e a Kassandra Entram no Mesmo Casal

O sistema de conexão foi pensado para ser **o mais simples possível**:

1. **No seu celular (Celular 1)**:
   - Abra o app e toque na aba **Ajustes** (ícone de engrenagem).
   - Você verá um código exclusivo destacado, por exemplo: `PAZ-4829`.
   - Clique em **"Copiar"** e envie esse código para o WhatsApp da Kassandra.
2. **No celular da Kassandra (Celular 2)**:
   - Ela abre o app no celular dela.
   - Vai na aba **Ajustes**, no campo *"Já possui um código criado pelo parceiro?"*.
   - Digita `PAZ-4829` e clica em **"Entrar"**.
   - No topo da tela, ela clica em *"Usar como Kassandra"*.
3. **Pronto!** A partir desse momento, tudo o que um marcar como feito, passar para o outro ou alterar atualiza instantaneamente no celular do parceiro!

---

## 3. Como Rodar no seu Computador ou no Celular via Wi-Fi

Se você quiser testar agora mesmo no seu computador ou no celular conectado no mesmo Wi-Fi de casa:

1. Abra o terminal (PowerShell) na pasta do projeto:
   ```bash
   npm run dev -- --host
   ```
2. O terminal mostrará dois endereços:
   - `Local: http://localhost:5173/` (para abrir no navegador do seu computador).
   - `Network: http://192.168.x.x:5173/` (para abrir no navegador do celular conectado no mesmo Wi-Fi!).

---

## 4. Passo a Passo Simples: Banco Online Gratuito (Firebase)

Para que os dois celulares sincronizem mesmo usando 4G/5G na rua sem estarem no mesmo Wi-Fi, o app usa o Google Firebase (que é 100% gratuito e não exige cartão de crédito).

Siga estes 5 passos de leigo:

1. Acesse **[console.firebase.google.com](https://console.firebase.google.com/)** e faça login com seu e-mail do Google.
2. Clique no botão **"Adicionar projeto"** (ou "Criar um projeto"):
   - Dê o nome: `Casa em Paz`.
   - Desmarque a opção do Google Analytics (não é necessária) e clique em **Criar projeto**.
3. Ative o Banco de Dados (Firestore):
   - No menu lateral esquerdo, clique em **Criação** (Build) ➔ **Firestore Database**.
   - Clique em **"Criar banco de dados"**.
   - Escolha o local (ex.: `southamerica-east1` ou o padrão dos EUA) e selecione **"Iniciar no modo de teste"** (para liberar a leitura/escrita do casal). Clique em **Ativar**.
4. Obtenha as chaves do aplicativo:
   - No menu lateral, clique na engrenagem ⚙️ no topo esquerdo ➔ **Configurações do projeto**.
   - Role até o final da página ("Seus aplicativos") e clique no ícone **`</>`** (Web).
   - Dê o apelido: `Casa em Paz Web` e clique em **Registrar app**.
   - O Firebase mostrará um bloco de código chamado `firebaseConfig`. Você só precisa copiar os textos entre aspas:
     ```javascript
     apiKey: "AIzaSy...",
     authDomain: "casa-em-paz.firebaseapp.com",
     projectId: "casa-em-paz"
     ```
5. Cole no Aplicativo:
   - No app, vá na aba **Ajustes** ➔ **Banco Online (Firebase)**.
   - Cole o `apiKey` e o `projectId` nos campos indicados e clique em **"Salvar e Conectar Banco Online"**.
   - **Pronto!** Uma bolinha verde aparecerá indicando: **"Conectado em Tempo Real"**.

---

## 5. Passo a Passo Simples: Publicar na Internet e Gerar o APK Android

### Método Mais Fácil do Mundo: Publicar na Vercel (Gratuito)
1. Crie uma conta gratuita em **[vercel.com](https://vercel.com/)** (pode logar com GitHub ou e-mail).
2. Arraste a pasta `dist` gerada pelo projeto ou conecte seu repositório do GitHub.
3. Em 30 segundos, você receberá um link público seguro com cadeado HTTPS (ex.: `https://casa-em-paz.vercel.app`).

### Gerando o APK para Android com 1 Clique (PWABuilder)
O **PWABuilder** é a ferramenta oficial e gratuita criada pela Microsoft para transformar PWAs em arquivos APK instaláveis do Android sem precisar mexer em código nativo:

1. Acesse **[pwabuilder.com](https://www.pwabuilder.com/)**.
2. Digite o link do seu app publicado (ex: `https://casa-em-paz.vercel.app`) e clique em **Start**.
3. O PWABuilder analisará o app (nosso `manifest.json`, ícone SVG e Service Worker já estão 100% configurados e prontos).
4. Clique no botão **"Package for Android"** ➔ **Generate**.
5. Ele baixará um arquivo `.zip` com o seu **APK pronto para instalar** no celular do casal! Basta enviar o arquivo APK pelo WhatsApp ou Google Drive e clicar em "Instalar".

---

## 6. Detalhes do Algoritmo Anti-Sobrecarga

O coração do aplicativo é o seu algoritmo de equilíbrio, que segue 4 diretrizes inegociáveis:
1. **Respeito aos Horários**: Nunca aloca tarefas em períodos em que o parceiro cadastrou como ocupado ou em dias corridos.
2. **Revezamento de Tarefas Pesadas (Nível 3)**: Se um lavou o banheiro ou limpou tapetes na semana anterior, o sistema aloca para o outro parceiro na semana seguinte, garantindo que ninguém se desgaste repetidamente.
3. **Compensação Imediata**: Quem assume uma tarefa pesada tem prioridade para receber tarefas leves em seguida.
4. **Proteção de Sobrecarga**: As tarefas marcadas inicialmente pela Kassandra (*ração dos gatos, caixa de areia, louça e lavar roupa à mão*) recebem um fator de alívio, fazendo com que você assuma essas tarefas com prioridade (85% de frequência padrão), aliviando o estresse da rotina dela!
