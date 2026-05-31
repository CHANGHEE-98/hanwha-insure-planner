// 한화손보 시상 및 영업 일정 플랫폼 초기 Mock 데이터베이스
window.INCENTIVE_DATABASE = {
  // 1. 초기 시상 목록 데이터
  incentives: [
    {
      id: "inc-001",
      title: "5월 4주 장기보장성 초회보험료 달성 시상",
      category: "long_auto",
      startDate: "2026-05-25",
      endDate: "2026-05-29",
      metricType: "premiums",
      metricUnit: "원",
      targetValue: 500000,
      currentValue: 180000,
      reward: "시상금 500,000원 지급",
      description: "5월 4주차 장기 보장성 초회보험료 50만 원 이상 달성 설계사 대상 현금 시상",
      weeklyIssue: "운전자보험 한도 축소 전 막판 스퍼트 절판 마케팅 집중 필요",
      direction: "기존 고객 대상 운전자보험 업셀링 플랜 제안서 전달 및 가족 일괄 가입 전략 활용",
      slideImage: "images/media__1780136981494.png"
    },
    {
      id: "inc-002",
      title: "5월 4주 자동차보험 특별 가동 시상",
      category: "long_auto",
      startDate: "2026-05-25",
      endDate: "2026-05-29",
      metricType: "contracts",
      metricUnit: "건",
      targetValue: 3,
      currentValue: 3,
      reward: "시상금 100,000원 지급",
      description: "5월 4주차 자동차보험 신규 청약 3건 이상 가동 설계사 대상 특별 장려금 시상",
      weeklyIssue: "운전자보험과 자동차보험 연계 청약 마케팅 효과 극대화",
      direction: "가족 단위 자동차보험 갱신 리스트 활용 및 차별화된 다이렉트 대비 혜택 강조 제안",
      slideImage: "images/media__1780137267439.png"
    },
    {
      id: "inc-003",
      title: "신인 도입 활성화 특별 주간 시상",
      category: "recruitment",
      startDate: "2026-05-25",
      endDate: "2026-05-29",
      metricType: "recruit_tier",
      metricUnit: "명",
      targetValue: 1,
      currentValue: 1,
      reward: "추가 소개비 200,000원 지급",
      description: "5월 4주차 신인 설계사 1명 도입 시 기존 소개 수당 외에 지점장 특별 추가 소개비 매칭",
      weeklyIssue: "주간 도입 타겟 FP 발굴 및 1:1 티타임 적극 권장",
      direction: "활동력 있는 후보자를 발굴하여 지점장 동반 미팅 추진 및 지점 분위기 활성화 유도",
      slideImage: "images/media__1780137762632.png"
    },
    {
      id: "inc-004",
      title: "2W 연속 가동 시상",
      category: "two_annual",
      startDate: "2026-05-01",
      endDate: "2026-05-31",
      metricType: "two_tier",
      metricUnit: "주",
      currentValue: 1,
      milestones: [
        { name: "1주 가동 (브론즈)", value: 1, reward: "시상 10,000원" },
        { name: "2주 연속 (실버)", value: 2, reward: "시상 30,000원" },
        { name: "3주 연속 (골드)", value: 3, reward: "시상 80,000원" },
        { name: "4주 연속 (다이아)", value: 4, reward: "시상 200,000원" }
      ],
      reward: "실버 이상 달성 시 연속가동 격려금 지급",
      description: "지점 FP 연속 활동성 보장을 위한 5월 주차별 연속 가동 격려금 프로모션",
      weeklyIssue: "매주 누락 없는 계약 가동 흐름 유지 관리",
      direction: "소액 화재보험이나 주택 보장 플랜을 활용해 1건 이상 가동 완료 관리",
      slideImage: "images/media__1780137432412.png"
    },
    {
      id: "inc-005",
      title: "2026 연도대상 통합 프로모션",
      category: "two_annual",
      startDate: "2026-01-01",
      endDate: "2026-12-31",
      metricType: "two_tier",
      metricUnit: "만 포인트",
      currentValue: 6500,
      milestones: [
        { name: "실버 클래스", value: 10000, reward: "해외 연수 및 특별 상패" },
        { name: "골드 클래스", value: 20000, reward: "부부 동반 비즈니스 해외 연수 및 포상금 200만 원" },
        { name: "플래티넘 클래스", value: 30000, reward: "최고 영예의 전당 헌액 및 포상금 500만 원" }
      ],
      reward: "연도대상 클래스별 특별 포상 및 해외 연수 특전",
      description: "2026년 한화손보 전사 우수 설계사 연도대상 선발 및 포인트 누적 인센티브",
      weeklyIssue: "장기적인 매출 흐름 확보 및 우수 고객 관리",
      direction: "우량 가망고객 집중 업셀링 플랜 제공 및 패밀리 그룹 일괄 보장 설계 연동",
      slideImage: "images/media__1780137850190.png"
    }
  ],

  // 2. 대시보드용 금주 주요 영업 이슈 & 방향 데이터
  weeklyIssues: [
    {
      id: "issue-1",
      title: "운전자보험 한도 축소 이슈 대응",
      subtitle: "5월 4주 장기보장성 핵심 전략",
      badge: "한도 축소 임박",
      content: "자동차 사고 처리 지원금 및 변호사 선임 비용 한도가 다음 달부터 하향 조정될 예정입니다. 이번 주가 최대 한도로 가입할 수 있는 마지막 기회임을 강조하여 적극적인 절판 마케팅을 펼쳐야 합니다.",
      actionPlan: "1. 기존 보장금액 3천만 원 이하 고객 리스트업\n2. 모바일로 '한도 증액 간편 플랜' 설계서 5건씩 발송\n3. '사고 시 방어비용 공백 해소'를 주제로 한 스토리텔링 화법 활용"
    },
    {
      id: "issue-2",
      title: "간편 건강보험 신규 담보 출시",
      subtitle: "유병자 시장 공략 전략",
      badge: "신담보 출시",
      content: "경증 및 만성질환자도 편리하게 가입 가능한 '3N5 간편건강보험'에 체증형 수술비 및 암 통원 치료비 신규 특약이 탑재되었습니다. 보장 범위가 획기적으로 넓어진 만큼 무심사 특별 심사 기간을 활용하세요.",
      actionPlan: "1. 가입 거절 이력이 있는 인수 보류 고객 재접촉\n2. 신담보 안내용 모바일 카드 이미지 단체 카톡 발송\n3. 주말 지점 미니 세미나로 신규 가입자 3명 목표 도입"
    },
    {
      id: "issue-3",
      title: "도입 대상자 초청 지점 사업설명회",
      subtitle: "5월 리쿠르팅 활성화 방안",
      badge: "지점 이벤트",
      content: "오는 목요일(5월 28일) 오전 10시 지점 대회의실에서 '한화손보 설계사의 비전과 소득 체계'를 주제로 도입 초청 세미나를 개최합니다. 지점 FP분들의 적극적인 지인 초청을 권장합니다.",
      actionPlan: "1. 평소 영업에 관심 있는 인맥 2명 리스트업\n2. '커피 모임' 형식의 가벼운 설명회 안내문 전달\n3. 동반 참석 시 추천 설계사에게 특별 기프티콘 증정"
    }
  ],

  // 3. 임의의 로그인 설계사 프로필 데이터 (현재 달성 현황 및 시뮬레이션을 위함)
  agentProfile: {
    name: "김한화",
    role: "fp", // 'fp' (FP) or 'bm' (지점장 / 관리자)
    branch: "팔용지점",
    currentStats: {
      contracts: 3, // 장기보장성 건수
      premiums: 180000, // 초회보험료
      goods: 1, // 자동차보험 가동 건수
      two连续: 1, // 2W 연속 주수
      points: 6500, // 연도대상 포인트
      recruits: 1 // 도입 인원
    }
  }
};
