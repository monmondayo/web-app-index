-- Add technologies used by apps whose stack was previously shown as unregistered.
INSERT OR IGNORE INTO tech_stacks (name, slug, category, color) VALUES ('Gradio', 'gradio', 'library', 'F97316');
INSERT OR IGNORE INTO tech_stacks (name, slug, category, color) VALUES ('Replicate', 'replicate', 'infrastructure', '000000');
INSERT OR IGNORE INTO tech_stacks (name, slug, category, color) VALUES ('Hugging Face', 'huggingface', 'infrastructure', 'FFD21E');
INSERT OR IGNORE INTO tech_stacks (name, slug, category, color) VALUES ('Android', 'android', 'other', '3DDC84');
INSERT OR IGNORE INTO tech_stacks (name, slug, category, color) VALUES ('Kotlin', 'kotlin', 'other', '7F52FF');
INSERT OR IGNORE INTO tech_stacks (name, slug, category, color) VALUES ('Jetpack Compose', 'jetpackcompose', 'library', '4285F4');
INSERT OR IGNORE INTO tech_stacks (name, slug, category, color) VALUES ('CameraX', 'androidstudio', 'library', '3DDC84');

INSERT OR IGNORE INTO app_tech (app_id, tech_id, usage_role)
SELECT a.id, t.id, 'アプリ実装' FROM apps a, tech_stacks t
WHERE a.title = 'ACE-Step 1.5 — Music Generator' AND t.name = 'Python';
INSERT OR IGNORE INTO app_tech (app_id, tech_id, usage_role)
SELECT a.id, t.id, 'UI・操作' FROM apps a, tech_stacks t
WHERE a.title = 'ACE-Step 1.5 — Music Generator' AND t.name = 'Gradio';
INSERT OR IGNORE INTO app_tech (app_id, tech_id, usage_role)
SELECT a.id, t.id, 'AIモデル実行' FROM apps a, tech_stacks t
WHERE a.title = 'ACE-Step 1.5 — Music Generator' AND t.name = 'Replicate';
INSERT OR IGNORE INTO app_tech (app_id, tech_id, usage_role)
SELECT a.id, t.id, 'ホスティング' FROM apps a, tech_stacks t
WHERE a.title = 'ACE-Step 1.5 — Music Generator' AND t.name = 'Hugging Face';

INSERT OR IGNORE INTO app_tech (app_id, tech_id, usage_role)
SELECT a.id, t.id, 'アプリ実装' FROM apps a, tech_stacks t
WHERE a.title = '自動BGM作成（３モデル）' AND t.name = 'Python';
INSERT OR IGNORE INTO app_tech (app_id, tech_id, usage_role)
SELECT a.id, t.id, 'UI・操作' FROM apps a, tech_stacks t
WHERE a.title = '自動BGM作成（３モデル）' AND t.name = 'Gradio';
INSERT OR IGNORE INTO app_tech (app_id, tech_id, usage_role)
SELECT a.id, t.id, 'AIモデル実行' FROM apps a, tech_stacks t
WHERE a.title = '自動BGM作成（３モデル）' AND t.name = 'Replicate';
INSERT OR IGNORE INTO app_tech (app_id, tech_id, usage_role)
SELECT a.id, t.id, 'ホスティング' FROM apps a, tech_stacks t
WHERE a.title = '自動BGM作成（３モデル）' AND t.name = 'Hugging Face';

INSERT OR IGNORE INTO app_tech (app_id, tech_id, usage_role)
SELECT a.id, t.id, 'モバイル基盤' FROM apps a, tech_stacks t
WHERE a.title = 'FlexiFocusCAM' AND t.name = 'Android';
INSERT OR IGNORE INTO app_tech (app_id, tech_id, usage_role)
SELECT a.id, t.id, 'アプリ実装' FROM apps a, tech_stacks t
WHERE a.title = 'FlexiFocusCAM' AND t.name = 'Kotlin';
INSERT OR IGNORE INTO app_tech (app_id, tech_id, usage_role)
SELECT a.id, t.id, 'UI・操作' FROM apps a, tech_stacks t
WHERE a.title = 'FlexiFocusCAM' AND t.name = 'Jetpack Compose';
INSERT OR IGNORE INTO app_tech (app_id, tech_id, usage_role)
SELECT a.id, t.id, 'カメラ制御' FROM apps a, tech_stacks t
WHERE a.title = 'FlexiFocusCAM' AND t.name = 'CameraX';
