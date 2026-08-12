# Domain Model

## Main Entity: CoffeeRecord

### Required

userId、title、consumedAt、recordType。これらは必須項目である。

### Optional

rating、notes、産地、品種、フレーバー。これらは任意項目である。

## Master Entities

産地、品種、精製方法、焙煎度、フレーバーは、それぞれ別コレクションのマスターデータとして管理している。そうすることで、グラフのノードを一貫して保てる。マスターデータにすることで、表記揺れを防げる。

## Farm / Cafe

farmとcafeNameだけは例外で、マスター化しない。

それぞれいくつもの種類があるため、マスター化は困難である。

## Knowledge Graph Terms

record、産地、農園、品種、精製方法、焙煎度、フレーバー、カフェがノードになり、recordから各属性へエッジが伸びる。
