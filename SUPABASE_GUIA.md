# ⚡ Guia Passo a Passo: Banco de Dados Supabase (100% Gratuito)

Este guia foi feito para quem não programa. Em **3 minutos**, você terá o seu banco de dados na nuvem pronto para sincronizar tudo e guardar as fotos das reclamações do casal!

---

## 1. Criar o Projeto no Supabase
1. Acesse **[supabase.com](https://supabase.com/)** e clique em **"Start your project"** (ou faça login com sua conta do GitHub).
2. Clique no botão verde **"New project"**.
3. Preencha os campos:
   - **Name**: `casa-em-paz`
   - **Database Password**: Escolha uma senha (ex.: `CasaEmPaz2026!`) e guarde.
   - **Region**: Escolha `South America (São Paulo)` para ficar mais rápido no Brasil.
4. Clique em **"Create new project"** e aguarde 1 minuto enquanto o Supabase prepara o banco.

---

## 2. Criar as Tabelas com 1 Clique (Script SQL)
1. No menu lateral esquerdo do Supabase, clique no ícone **SQL Editor** (parece um terminal com `>_`).
2. Clique em **"New query"**.
3. Copie todo o código abaixo e cole dentro do editor:

```sql
-- 1. Cria a tabela de Reclamações e Desabafos (com fotos)
CREATE TABLE IF NOT EXISTS public.feedbacks (
    id TEXT PRIMARY KEY,
    couple_code TEXT NOT NULL DEFAULT 'CASAL-PAZ',
    from_user_id TEXT NOT NULL,
    to_user_id TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    image_url TEXT,
    severity TEXT DEFAULT 'gentle',
    status TEXT DEFAULT 'pending',
    response_note TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    resolved_at TIMESTAMPTZ
);

-- 2. Cria a tabela de Estado das Tarefas do Casal
CREATE TABLE IF NOT EXISTS public.couples_state (
    couple_code TEXT PRIMARY KEY,
    state JSONB NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Habilita o Realtime (transmissão ao vivo para os celulares)
ALTER PUBLICATION supabase_realtime ADD TABLE public.feedbacks;
ALTER PUBLICATION supabase_realtime ADD TABLE public.couples_state;

-- 4. Libera permissão de leitura e gravação simples para o casal
ALTER TABLE public.feedbacks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.couples_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Acesso Livre Casal Feedbacks" ON public.feedbacks 
FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Acesso Livre Casal Estado" ON public.couples_state 
FOR ALL USING (true) WITH CHECK (true);
```

4. Clique no botão verde **"Run"** no canto inferior direito.
5. Pronto! Aparecerá a mensagem **"Success. No rows returned"**. As tabelas já estão criadas e com transmissão em tempo real ativada!

---

## 3. Pegar as Chaves e Colar no Aplicativo
1. No menu lateral do Supabase, clique na engrenagem ⚙️ (**Project Settings**) no final da barra.
2. Clique em **"Data API"** (ou **API**).
3. Você verá dois campos essenciais:
   - **Project URL**: Algo como `https://abcdefghijk.supabase.co`
   - **Project API Keys**: Copie a chave que está identificada como **`anon` / `public`**.
4. No aplicativo **Casa em Paz**, vá na aba **Ajustes** ➔ **Banco de Dados (Supabase)**:
   - Cole a **Project URL**
   - Cole a **Anon Key**
   - Clique em **"Salvar e Conectar Supabase"**.

**Pronto!** A partir de então, o aplicativo guardará todo o histórico e as fotos no seu próprio banco de dados Postgres!
