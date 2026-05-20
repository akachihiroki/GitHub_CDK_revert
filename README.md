# CDK TypeScript プロジェクトへようこそ

このリポジトリは、TypeScript で AWS CDK を開発するためのプロジェクトです。

`cdk.json` には、CDK Toolkit がアプリを実行する方法が定義されています。

## よく使うコマンド

* `npm run build`   TypeScript を JavaScript にコンパイル
* `npm run watch`   変更を監視して自動コンパイル
* `npm run test`    Jest のユニットテストを実行
* `npx cdk deploy`  デフォルトの AWS アカウント/リージョンにスタックをデプロイ
* `npx cdk diff`    デプロイ済み状態との差分を確認
* `npx cdk synth`   CloudFormation テンプレートを生成

## GitHub Actions CI/CD

このリポジトリには、次の 3 つのワークフローが含まれています。

* `.github/workflows/ci.yml`
	* トリガー: `master` 向けの Pull Request、`master` への push
	* 実行内容: `npm ci` -> `npm run build` -> `npm run test` -> `npx cdk synth`

* `.github/workflows/deploy.yml`
	* トリガー: `master` への push、手動実行 (`workflow_dispatch`)
	* 実行内容: GitHub OIDC で AWS IAM ロールを引き受け、`npx cdk diff` -> `npx cdk deploy --require-approval never` を実行

* `.github/workflows/auto-merge.yml`
	* トリガー: `master` 向け Pull Request の `opened/reopened/synchronize/ready_for_review`
	* 実行内容: PR の Auto-merge を自動で有効化（`SQUASH` マージ）

### 必要な GitHub 設定

GitHub リポジトリの設定で、次の順に構成してください。

#### 1. デフォルトブランチ確認

本リポジトリのワークフローは `master` を対象にしています。

* `Settings` -> `Branches` -> `Default branch`
	* `master` に設定する

`main` をデフォルトブランチとして使う場合は、ワークフロー側の対象ブランチも `main` に合わせてください。

#### 2. Ruleset（推奨: PR必須化）

最新の GitHub では、Branch protection より Ruleset の利用が推奨です。

* `Settings` -> `Rules` -> `Rulesets` -> `New ruleset` -> `New branch ruleset`
	* Ruleset name: 例 `protect-master`
	* Enforcement status: `Active`
	* Target branches: `master`
	* `Restrict updates` を有効化（直接 push を制限）
	* `Require a pull request before merging` を有効化
	* `Required approvals`: 1 以上
	* `Require status checks to pass` を有効化
	* Required checks に `CI / test-and-synth`（または `test-and-synth`）を追加
	* `Require conversation resolution before merging` を有効化（推奨）
	* `Block force pushes` を有効化
	* `Block deletions` を有効化
	* Bypass は最小限（原則なし）に設定

この設定により、`master` への直接 push は基本的に禁止され、PR マージ経由のみ更新されます。

#### 3. Branch protection（Rulesetを使わない場合のみ）

Ruleset を使わない場合は、従来の Branch protection を設定してください。

* `Settings` -> `Branches` -> `Add branch protection rule`
	* `Branch name pattern`: `master`
	* `Require a pull request before merging`: 有効化
	* `Require approvals`: 1 以上
	* `Require status checks to pass before merging`: 有効化
	* 必須チェック: `CI / test-and-synth`（表示は環境で異なる）
	* `Require conversation resolution before merging`: 有効化を推奨
	* `Do not allow bypassing the above settings`: 有効化（推奨）

PR がマージされると GitHub が `master` への push を作成し、その push をトリガーに deploy ワークフローが自動実行されます。

#### 4. Actions の実行ポリシー

* `Settings` -> `Actions` -> `General`
	* `Actions permissions`: `Allow all actions and reusable workflows`（または社内ポリシーに応じた許可設定）
	* `Workflow permissions`: `Read repository contents permission`
	* `Allow GitHub Actions to create and approve pull requests`: 無効のままで可（本リポジトリ構成では不要）

補足: 本リポジトリの workflow 側で OIDC を使うために `permissions: id-token: write` を設定済みです。これは OIDC トークン発行許可であり、リポジトリ書き込み権限ではありません。

#### 4.5 Auto-merge を完全自動化する設定

`auto-merge.yml` により、PR 作成時に Auto-merge 自体は自動で有効化されます。
ただし GitHub 側で Auto-merge 機能が無効だと実行できないため、次を一度だけ設定してください。

* `Settings` -> `General` -> `Pull Requests`
	* `Allow auto-merge` を有効化

レビュー承認なしで完全自動にしたい場合は、Ruleset / Branch protection の `Required approvals` を `0` にしてください。
（承認必須のままだと、承認操作が入るまで自動マージは完了しません）

#### 5. Secrets / Variables

* `Settings` -> `Secrets and variables` -> `Actions` -> `Secrets`
	* `AWS_ROLE_ARN`: GitHub Actions が Assume する IAM ロール ARN

* `Settings` -> `Secrets and variables` -> `Actions` -> `Variables`（任意）
	* `AWS_REGION`: デプロイ先リージョン（未設定時は `ap-northeast-1`）

推奨: 環境ごとに分ける場合は、Repository secrets ではなく Environment secrets を使って権限分離してください。

#### 6. （推奨）Environment 保護

本番環境で安全性を高める場合は、`Environment` を作成して手動承認を入れる運用がおすすめです。

* `Settings` -> `Environments` -> `New environment`
	* 例: `production`
	* `Required reviewers` を設定
	* `Deployment branches and tags` で `master` のみに制限
	* （必要に応じて）Environment secrets を使用

Environment を OIDC 条件に含める場合、`sub` は次の形式になります。

* `repo:<OWNER>/<REPO>:environment:<ENVIRONMENT_NAME>`

OIDC を利用するため、IAM ロールの信頼ポリシーで対象リポジトリを許可してください。例:

```json
{
	"Version": "2012-10-17",
	"Statement": [
		{
			"Effect": "Allow",
			"Principal": {
				"Federated": "arn:aws:iam::<ACCOUNT_ID>:oidc-provider/token.actions.githubusercontent.com"
			},
			"Action": "sts:AssumeRoleWithWebIdentity",
			"Condition": {
				"StringEquals": {
					"token.actions.githubusercontent.com:aud": "sts.amazonaws.com"
				},
				"StringLike": {
					"token.actions.githubusercontent.com:sub": "repo:<OWNER>/<REPO>:*"
				}
			}
		}
	]
}
```

より厳密にする場合は、`StringLike` のワイルドカードを使わず、ブランチまたは environment を固定してください。

* ブランチ固定例: `repo:<OWNER>/<REPO>:ref:refs/heads/master`
* Environment 固定例: `repo:<OWNER>/<REPO>:environment:production`

#### 7. 動作確認チェックリスト

* PR 作成時に `CI / test-and-synth` が成功する
* CI 未成功の状態では `master` へマージできない
* PR マージ後、`Deploy` workflow が自動起動する
* `Deploy` 内で `cdk diff` の後に `cdk deploy` が実行される

### 初回準備

deploy ワークフローを使う前に、対象アカウント/リージョンで一度だけ CDK bootstrap を実行してください。

* `npx cdk bootstrap aws://<ACCOUNT_ID>/<REGION>`

bootstrap と各種設定が完了すると、`master` へのマージ後に `cdk diff` と `cdk deploy` が自動実行されます。
