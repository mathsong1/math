/*
 * 전체 메뉴 정의
 * ─────────────────────────────────────────────
 * 원본 자바 프로그램(NumberTheoryProblemSolution.java)의 11개 버튼과
 * 각 모듈의 하위 기능 버튼(buttonMsg)을 그대로 옮긴 것입니다.
 *
 * 새 기능을 구현하면 assets/js/modules/<모듈id>.js 에서
 *   KPHS.register('<모듈id>', '<기능id>', { help, placeholder, run })
 * 형태로 등록하면 자동으로 '계산' 버튼이 활성화됩니다.
 */
window.KPHS_MENU = [
  {
    id: 'calculator', page: 'calculator.html', title: '계산기', en: 'Calculator',
    summary: '큰 수 계산기 (일반용·과학용·수학용·정수론용·통계용)',
    java: 'BigCalculationUMP_5.java',
    features: [
      { id: 'general', name: '일반용', desc: '사칙연산, 순열 mPn, 조합 mCn, 계승 m!, 지수, 제곱근, 세제곱근, 역수, 몫, 나머지, sin·cos·tan·log, e, π. 큰 수는 BigInt로 정확하게 계산합니다.' },
      { id: 'scientific', name: '과학용', desc: '논리연산(AND, OR, XOR), Shift 연산(<<, >>, >>>), 비트연산(&, |, ^, ~).' },
      { id: 'math', name: '수학용', desc: '중복순열 mΠn, 중복조합 mHn, 전사함수 개수 mTn, 제2종 스털링 수 mSn, 벨 수 mBn, 자연수 분할 p(n).' },
      { id: 'number', name: '정수론용', desc: '오일러 함수 φ(n), 최소 원시근, 무리수의 연분수, 교란수 D(n), 카탈란 수, 감마함수 Γ(n).' },
      { id: 'stat', name: '통계용', desc: '정규분포, χ² 분포, Student t-분포, F-분포, 이항분포 값.' }
    ]
  },
  {
    id: 'number-theory', page: 'number-theory.html', title: '정수론', en: 'Number Theory',
    summary: '인수분해, 원시근, 이산대수, 연분수, 부정 및 펠 방정식',
    java: 'CongruenceNcontiFractionUMP_5.java',
    features: [
      { id: 'factor', name: '인수분해', desc: '소인수분해, 약수의 개수와 합, 뫼비우스 함수, n!에서 소수 p의 지수(예: 35!의 끝자리 0의 개수).' },
      { id: 'primitive', name: '원시근', desc: 'GCD·LCM, 위수 ordₙ(a), 최소 원시근, 원시근의 개수와 전체 목록.' },
      { id: 'dlog', name: '이산대수', desc: '다항 합동식 f(x) ≡ c (mod p), 7·4ˣ ≡ 13 (mod 17) 같은 지수 합동식, 르장드르 기호, 중국인 나머지 정리.' },
      { id: 'cfrac', name: '연분수', desc: '연분수 ↔ 분수, 소수·무리수·초월수(π, e, sin x …)를 연분수로 전개.' },
      { id: 'diophantine', name: '부정방정식', desc: '일차 부정방정식 ax + by = c, 합동 부정방정식, 펠 방정식 x² − dy² = ±1, x² + bxy + cy² = d 형태.' }
    ]
  },
  {
    id: 'statistics', page: 'statistics.html', title: '이산통계', en: 'Statistics',
    summary: '통계값, 신뢰구간, 회귀분석, 비모수추정, 통계표',
    java: 'StasticsUMP_5.java',
    features: [
      { id: 'summary', name: '통계값', desc: '자료의 평균, 분산, 표준편차, 중앙값, 사분위수, 도수분포.' },
      { id: 'ci', name: '신뢰구간', desc: '모평균, 모분산, 분산비의 신뢰구간 추정과 검정.' },
      { id: 'regression', name: '회귀분석', desc: '회귀직선, 이차 회귀곡선의 계수 추정 및 검정.' },
      { id: 'nonparam', name: '비모수추론', desc: '부호 검정, Wilcoxon 순위합·부호순위 검정.' },
      { id: 'tables', name: '통계표', desc: '이항·정규·χ²·t·F·기하·초기하·포아송·감마 분포표.' }
    ]
  },
  {
    id: 'functions', page: 'functions.html', title: '이산·특수함수', en: 'Functions',
    summary: '진법, 지수로그, 삼각쌍곡, 이산함수, 특수함수',
    java: 'MultiCaseFunctionUMP_5.java',
    features: [
      { id: 'base', name: '진법변환', desc: 'm진수 → 10진수, 10진수 → n진수, m진수 → n진수(소수점 포함, 36진법까지), 칸토어 표현.' },
      { id: 'explog', name: '지수로그', desc: 'exp(x), mˣ, √x, ∛x, log x, logₘ x, m!!, 일반화 이항계수 ₓCₖ.' },
      { id: 'trig', name: '삼각쌍곡', desc: 'sin·cos·tan, sinh·cosh·tanh와 역함수의 값, 미분, 합 공식.' },
      { id: 'discrete', name: '이산함수', desc: '순열·조합(nPr, nCr, nHr, nΠr), 스털링 수, 분할수, 카탈란 수, 벨 수, 교란수, 다항계수, 루크 다항식.' },
      { id: 'special', name: '특수함수', desc: '감마 Γ, 베타 B, 오차함수 erf, 베셀 함수 J 등의 정의와 값.' }
    ]
  },
  {
    id: 'matrix', page: 'matrix.html', title: '행렬활용', en: 'Matrix',
    summary: '행렬(복소수·사원수·벡터) 연산, 연립방정식, 대각화, 고유값',
    java: 'MatrixProcessUMP_5.java',
    features: [
      { id: 'ops', name: '연산', desc: '행렬의 합·차·스칼라곱·곱, 2×2 행렬로 복소수 연산, 2×4 행렬로 사원수 연산, n-벡터 연산과 부피.' },
      { id: 'solve', name: '방정식', desc: 'LU·SVD 분해로 연립방정식 풀이, 최소제곱해.' },
      { id: 'diag', name: '대각화', desc: '고유분해로 대각화, QR 분해로 직교화, 이차형식의 표준화.' },
      { id: 'linear', name: '선형변환', desc: 'T : V → W의 상, 기저변환, 전이행렬.' },
      { id: 'etc', name: '기타', desc: '행렬식, 역행렬, rank, pivot, 고유값·고유벡터, Binet 형태 수열(피보나치, 루카스, 펠 …)의 일반항.' }
    ]
  },
  {
    id: 'plane', page: 'plane.html', title: '평면도형', en: 'Plane',
    summary: '평면벡터, 직선, 도형, 다항함수, 특수 다항식',
    java: 'Vector2DSpaceUMP_5.java',
    features: [
      { id: 'vector', name: '평면벡터', desc: '벡터 연산, 내적, 각, 노름, 단위벡터, 내·외분점, 삼각형의 무게중심·외심·수심·내심.' },
      { id: 'line', name: '직선', desc: '직선의 방정식, 두 직선의 교점, 점과 직선 사이 거리, 각의 이등분선, 위치관계.' },
      { id: 'figure', name: '도형', desc: '다각형의 넓이, 점의 내·외부 판정, f(x, y) = 0의 평행·대칭·회전 이동, 자취.' },
      { id: 'poly', name: '다항함수', desc: '함수값, 조립제법, 미분계수, 접선·법선, 곡률, 다항식 사칙연산, 근, 극값, 정적분, 넓이, 회전체 부피.' },
      { id: 'specialpoly', name: '특수함수', desc: '체비쇼프, 르장드르, 에르미트, 라게르, 야코비, 베르누이, 피보나치, 루카스 다항식 등.' }
    ]
  },
  {
    id: 'space', page: 'space.html', title: '공간도형', en: 'Space',
    summary: '공간벡터, 직선, 평면, 회전, 길이·넓이·부피',
    java: 'Vector3DSpaceUMP_5.java',
    features: [
      { id: 'vector3d', name: 'Vector3D', desc: '합·차·스칼라곱·내적·외적, 단위벡터, 삼각형의 오심, 사면체의 외심.' },
      { id: 'line3d', name: '직선', desc: '두 점을 지나는 직선, 방향벡터가 주어진 직선, 평면에 수직인 직선, 수선의 발.' },
      { id: 'plane3d', name: '평면', desc: '세 점·점과 직선·두 직선을 포함하는 평면, 교선을 포함하는 평면.' },
      { id: 'rotation', name: 'Rotation', desc: '평행이동, 축 u와 각 θ에 대한 회전, 교점과 교선.' },
      { id: 'lav', name: 'L·A·V', desc: '벡터의 길이, 삼각형 넓이, 사면체 부피, 두 벡터가 이루는 각.' }
    ]
  },
  {
    id: 'calendar', page: 'calendar.html', title: 'Calendar', en: 'Calendar',
    summary: '두 달치 달력', java: 'Calendar2UMP.java', standalone: true
  },
  {
    id: 'puzzle', page: 'puzzle.html', title: 'Puzzle 5×5', nav: 'Puzzle', en: 'Puzzle',
    summary: '그림 맞추기 게임', java: 'Puzzle5x5UMP.java', standalone: true
  },
  {
    id: 'graph', page: 'graph.html', title: 'Graph', en: 'Graph',
    summary: '2D 그래프, 그래프 개형, 3D 그래프, 아핀변환, 문제풀이 예',
    java: 'MainProgramOfGraphUMP.java 외 6개',
    features: [
      { id: 'curve1', name: '평면곡선1', desc: 'y = f(x) 형태의 그래프와 변환.', java: 'GraphTransformation1UMP.java' },
      { id: 'curve2', name: '평면곡선2', desc: '음함수·극좌표 곡선과 변환.', java: 'GraphTransformation2UMP.java' },
      { id: 'curve3', name: '평면곡선3', desc: '매개변수 곡선: 사이클로이드, 하이포·에피사이클로이드, 장미곡선, 리사주, 나선, 리마송, 포락선, 신개선·축폐선 등.', java: 'GraphPlaneCurveUMP_5.java' },
      { id: 'intersect', name: '그래프 교점', desc: '두 그래프의 교점과 방정식의 근.', java: 'GraphNRootUMP.java' },
      { id: 'polyshape', name: '정함수 개형', desc: '다항함수의 개형, 극값, 변곡점.', java: 'GraphNPolynomialUMP.java' },
      { id: 'curve3d', name: '공간곡선', desc: '3차원 매개변수 곡선 (마우스로 회전·확대).', java: 'Graph3DCurve1xyzUMP.java' },
      { id: 'affine', name: 'Affine 변환', desc: '회전·확대·대칭·전단 변환의 시각화.', java: 'ExampleOfAffineTransform.java' },
      { id: 'examples', name: '문제풀이 예', desc: '정수론·행렬·벡터공간의 정의, 정리, 예제, 연습문제 (27개 항목).', java: 'ExampleOfNTPSTapButtonUMP.java' }
    ]
  },
  {
    id: 'about', page: 'about.html', title: '프로그램 내용', nav: '소개', en: 'About',
    summary: '프로그램 내용 및 문제점, 만든 사람', standalone: true
  }
];
