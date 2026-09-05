中3 国語文法アプリ ― 分割管理版・敬語最終磨き込み
================================================

構成
・index.html        画面構造
・style.css         見た目・iPadレイアウト
・app.js            アプリ動作
・data.js           全747問
・lecture-data.js   文法資料80項目

敬語30問
・同じ「普通語 → 同じ敬語」の単純重複をなくして再設計
・元の普通語が異なる場合は同じ敬語でも残しています
  例：いる／行く／来る → いらっしゃる
・読む→お読みになる、待つ→お待ちになる、
  会う→お目にかかる、参る、存じる等を追加
・最後3問は複数表現を組み合わせた総合問題

文法資料
・講義用80項目を内蔵
・トップの「文法資料」から参照できます


Apple Pencil安定化
・iPad Safariの文字選択／コピー／長押しメニューを手書き欄で抑止
・pointerイベントをpassive:falseで処理
・pointer captureを使用して、欄内でのストローク継続性を改善
・coalesced eventsに対応し、速い筆記時の線切れを軽減


Version
・トップページに「Version 6 / Apple Pencil調整版」を常時表示
・更新版へ切り替わったかを視覚的に確認できます


Version 7 / Pencil入力強化版
・トップにVersion 7表示
・手書き欄右下に入力判定（pen / touch / mouse）を表示
・Safariがpointer captureを失ってもwindow側でストローク追跡
・selectionchange時に文字選択を解除
・touch/gesture/contextmenu/selectstart/dragstartを手書き欄で抑止
