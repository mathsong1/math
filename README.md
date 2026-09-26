# 수학 및 그래프 Program — 웹 버전

자바 Swing 프로그램(Ver 4.5.0)을 브라우저에서 돌아가는 HTML/JavaScript로 옮기는 중인 사이트입니다.
빌드 과정 없이 파일 그대로 GitHub Pages에 올리면 동작합니다.

## GitHub Pages에 올리기

1. GitHub에서 새 저장소를 만듭니다 (예: `kphs-math`).
2. `KPHSCompleteProgram` 폴더를 통째로 올립니다. 자바 원본은 그대로 두고, 웹 사이트는 `docs/` 폴더에 있습니다.
3. 저장소 **Settings → Pages → Build and deployment**에서
   - Source: **Deploy from a branch**
   - Branch: **main** / 폴더: **/docs** 를 선택하고 Save
4. 1~2분 뒤 `https://<GitHub아이디>.github.io/<저장소이름>/` 에서 열립니다.

> `docs/.nojekyll` 파일은 GitHub Pages가 파일을 가공하지 않고 그대로 내보내게 하는 표시입니다. 지우지 마세요.

내 컴퓨터에서 미리 보려면 `docs` 폴더에서 `python -m http.server` 를 실행한 뒤 http://localhost:8000 을 열면 됩니다.
(HTML 파일을 더블클릭해서 열어도 대부분 동작합니다.)

## 폴더 구조

```
docs/
├─ index.html            메인 메뉴 (11개 카드)
├─ calculator.html       계산기 (일반·과학·수학·정수론·통계용)
├─ number-theory.html    정수론 (인수분해, 원시근, 이산대수, 연분수, 부정방정식)
├─ statistics.html       이산통계 (통계값, 신뢰구간, 회귀분석, 비모수추론, 통계표)
├─ functions.html        이산·특수함수 (진법, 지수로그, 삼각쌍곡, 이산함수, 특수함수)
├─ matrix.html           행렬활용 (연산, 방정식, 대각화, 선형변환, 기타)
├─ plane.html            평면도형 (평면벡터, 직선, 도형, 다항함수, 특수 다항식)
├─ space.html            공간도형 (Vector3D, 직선, 평면, Rotation, L·A·V)
├─ graph.html            Graph (평면곡선 1·2·3, 교점, 개형, 공간곡선, 아핀변환, 문제풀이 예)
├─ calendar.html         달력
├─ puzzle.html           5×5 퍼즐
├─ about.html            프로그램 내용 및 문제점
└─ assets/
   ├─ css/style.css      전체 디자인 (밝은/어두운 테마)
   └─ js/
      ├─ menu.js         메뉴와 하위 기능 목록
      ├─ common.js       상단 메뉴, 모듈 화면 틀, 기능 등록 함수, 키패드
      ├─ core/           계산 엔진 (외부 라이브러리 없이 직접 구현)
      │  ├─ expr.js      수식 해석 (2x, 2pi/5, sqrt(3), sin^2(x), 30°, 다항식 전개)
      │  ├─ num.js       분수·제곱근·π 꼴 표시, 미분·적분·근 찾기
      │  ├─ linalg.js    행렬 (LU, QR, 고유값, SVD, 역행렬, 최소제곱)
      │  ├─ stats.js     분포 (정규, t, χ², F, 이항, 포아송 …), 감마·베타·erf·베셀
      │  └─ plot.js      2D·3D 그래프 (끌어서 이동·회전, 휠로 확대)
      ├─ data/examples.js   문제풀이 예 81개 (원본에서 옮긴 내용)
      └─ modules/        메뉴별 기능 (위 HTML 과 이름이 같음)
```

## 진행 상황

원본의 모든 메뉴(계산 모듈 8개, 달력, 퍼즐, 소개)를 옮겼습니다. 기능 43개, 세부 기능 194개.
Apache Commons Math 가 하던 일은 `core/` 폴더의 파일들이 대신합니다.

### 원본과 달라진 점
- 입력: `{1, 2, 0, -1, 7, 23, 1}` 처럼 숫자와 선택 번호를 넣던 방식 대신, 세부 기능을 목록에서 고르고
  `x^3 + 2x^2 - 1 ≡ 7 (mod 23)` 처럼 식을 그대로 씁니다. 입력방법의 예시를 누르면 바로 계산됩니다.
- 정수·분수 계산은 BigInt 로 자릿수 제한 없이 정확합니다. 결과는 가능하면 분수, a√b, π 꼴로 함께 보여 줍니다.
- 모든 그래프는 끌어서 이동하고 휠로 확대할 수 있으며, 3D 그래프는 마우스로 돌려 볼 수 있습니다.
- 원본 예시 중 공간 회전 예 (점 (3,0,0), 중심 (0,1,0), 축 (1,1,0), 180°) 의 답은 (−1, 4, 0) 으로 바로잡았습니다.

## 새 기능을 추가하는 방법

1. `assets/js/modules/<모듈id>.js` 파일을 만들고 기능을 등록합니다.

   ```js
   KPHS.register('matrix', 'etc', {   // 세부 기능이 여러 개면 { ops: [ {id, name, help, run}, … ] }
     help: [ ['1 2; 3 4', '행렬식, 역행렬, rank'] ],   // 입력 예시와 설명
     placeholder: '예) 1 2; 3 4',
     run(text) {
       // 계산 후 결과를 HTML 문자열로 돌려줌. 잘못된 입력은 throw new Error('설명')
       return '<p>det = -2</p>';
     }
   });
   ```

2. 새 모듈 파일을 만들었다면 해당 HTML 파일과 `index.html` 아래쪽에 `<script src="assets/js/modules/파일이름.js"></script>` 줄을 넣습니다.
   (기존 모듈에 기능을 더할 때는 그 파일 안에 register 만 추가하면 됩니다.)

등록된 기능은 자동으로 '계산' 버튼이 켜지고 목록 옆에 초록 점이 표시됩니다.

## 앞으로 쓸 라이브러리 (Apache Commons Math 대신)

| 용도 | 라이브러리 |
|---|---|
| 큰 정수 | JavaScript 기본 `BigInt` |
| 정밀 소수 (BigDecimal) | decimal.js |
| 행렬, 고유값, 분해 | math.js |
| 통계 분포, 검정 | jStat |
| 2D·3D 그래프 | Plotly.js 또는 function-plot |
| 수식 표시 | KaTeX |

모두 `https://cdn.jsdelivr.net/npm/...` 주소로 `<script>` 한 줄이면 불러올 수 있어서 GitHub Pages에서도 그대로 됩니다.
