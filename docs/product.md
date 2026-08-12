# Product

---

## Vision

### Why

コーヒーアプリには競合がたくさんある。それらは大きく次の2つに分けられる。

- ジャーナル型（記録が時系列に並ぶ）アプリ
- SNS型（評価やフォロー機能が中心）

しかし、これらは自分がどのようなコーヒーを選んでいるか、産地やフレーバーにどんな関係性があるかを後から発見しにくいという弱点がある。記録は溜まるが、気づきにくい。

そこで、ObsidianのようなPKMツールの発想を取り入れる。記録を保存すると、産地、農園、品種、精製方法、焙煎、フレーバーという要素同士がリンクし合う知識グラフとして扱う。

### Core Experience

Record -> Connect -> Discover という中心体験

1. Record: コーヒーを記録する。
2. Connect: 記録に含まれる要素が過去の記録と繋がる。
3. Discover: 育ったグラフを見て気づきを得る。

### Target User

コーヒーが好きだが専門知識はなく、自分の好みを知りたい人、記録を続けながら自然に学びたい人向け。

### Product Identity

- このアプリはECサイトではない。
- 専門的なカッピング管理でもない。
- SNS的な写真優先でもない。
- AIチャット中心のサービスではない。

Obsidianのような道具感と、Linearのような静かさを重視している。

### Success Definition

MVPとしては、Record -> Connect -> Discoverが一通り機能することを目標にする。

- コーヒーを記録できる。
- その記録に複数の要素を関連付けできる。
- グラフ上で記録と要素のつながりを見れる。
- グラフ上のノードから過去の記録に遷移できる。
- 自分の好みの傾向を得られる。

---

## Product Principles

### 1. Record First

記録はタイトルと日時があれば保存できるようにしている。項目が多いとユーザーを飽きさせてしまうためだ。

### 2. Connect Automatically

グラフはユーザーが作るのではなく、記録することでアプリが自動的に作る。

### 3. Discovery Must Be Actionable

発見は数値表示だけで終わらせない。

### 4. Progressive Disclosure

初めから全項目を見せない。

### 5. Personal Knowledge Over Global Completeness

世界中のデータではなく、自分の記録を中心に考える。

### 6. One Source of Truth

同じ要素はマスターデータで一括管理する。

### 7. MVP Before Intelligence

MVPの段階ではAI推薦機能は実装しない。
