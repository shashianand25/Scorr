import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Image,
  Modal,
  ScrollView,
  Platform,
  Dimensions,
  Alert,
  TextInput,
  Linking,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather, Ionicons, FontAwesome6 } from "@expo/vector-icons";

// Get screen width/height for layout sizing
const { width: SCREEN_WIDTH } = Dimensions.get("window");

function ToggleSwitch({ checked, onChange, disabled }: { checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <Pressable
      onPress={() => !disabled && onChange(!checked)}
      disabled={disabled}
      style={[
        styles.switchContainer,
        checked ? { backgroundColor: "#00e5a0" } : { backgroundColor: "rgba(255, 255, 255, 0.12)" },
        disabled && { opacity: 0.4 }
      ]}
    >
      <View style={[styles.switchCircle, checked ? { transform: [{ translateX: 18 }] } : { transform: [{ translateX: 0 }] }]} />
    </Pressable>
  );
}

function Stepper({
  value,
  min,
  max,
  step = 1,
  onChange,
  suffix = "",
}: {
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (v: number) => void;
  suffix?: string;
}) {
  return (
    <View style={styles.stepperContainer}>
      <Pressable
        onPress={() => onChange(Math.max(min, value - step))}
        disabled={value <= min}
        style={({ pressed }) => [
          styles.stepperBtn,
          value <= min && styles.stepperBtnDisabled,
          pressed && styles.opacityPress,
        ]}
      >
        <Feather name="minus" size={14} color={value <= min ? "#444" : "#00e5a0"} />
      </Pressable>
      
      <View style={styles.stepperValueContainer}>
        <Text style={styles.stepperValueText}>
          {value}
          {suffix}
        </Text>
      </View>

      <Pressable
        onPress={() => onChange(Math.min(max, value + step))}
        disabled={value >= max}
        style={({ pressed }) => [
          styles.stepperBtn,
          value >= max && styles.stepperBtnDisabled,
          pressed && styles.opacityPress,
        ]}
      >
        <Feather name="plus" size={14} color={value >= max ? "#444" : "#00e5a0"} />
      </Pressable>
    </View>
  );
}

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<"home" | "dashboard" | "add" | "guide" | "menu">("home");
  const [selectedQuiz, setSelectedQuiz] = useState<any | null>(null);
  const [selectionMode, setSelectionMode] = useState<"all" | "random" | "range" | "unanswered" | "wrong">("all");
  const [randomCount, setRandomCount] = useState<number>(5);
  const [rangeStart, setRangeStart] = useState<number>(1);
  const [rangeEnd, setRangeEnd] = useState<number>(5);
  const [shuffleQuestions, setShuffleQuestions] = useState<boolean>(false);
  const [shuffleAnswers, setShuffleAnswers] = useState<boolean>(false);
  const [showAnswerOnSubmit, setShowAnswerOnSubmit] = useState<boolean>(true);
  const [timePerQuestion, setTimePerQuestion] = useState<number | null>(null);

  const totalQuestions = selectedQuiz?.questions ?? 0;
  const wrongCount = selectedQuiz?.wrongQuestions?.length ?? 0;
  const unansweredCount = selectedQuiz?.attempts?.length > 0 ? 0 : totalQuestions;

  // Compute how many questions will be used
  const questionCount = (() => {
    switch (selectionMode) {
      case "random":
        return Math.min(randomCount, totalQuestions);
      case "range":
        return Math.max(0, Math.min(rangeEnd, totalQuestions) - Math.max(rangeStart - 1, 0));
      case "unanswered":
        return unansweredCount;
      case "wrong":
        return wrongCount;
      default:
        return totalQuestions;
    }
  })();

  // Add mock quizzes state for dashboard
  const [quizzes, setQuizzes] = useState([
    {
      id: "1",
      title: "Biology: Cells & Genetics",
      questions: 5,
      category: "Science",
      time: "2h ago",
      attempts: [
        { id: "a1", score: 80, correct: 4, wrong: 1, skipped: 0, timestamp: Date.now() - 7200000 },
        { id: "a2", score: 60, correct: 3, wrong: 2, skipped: 0, timestamp: Date.now() - 86400000 },
      ],
      wrongQuestions: [
        { id: "q2", prompt: "Which organelle is known as the powerhouse of the cell?", selected: "Ribosome", correct: "Mitochondria" }
      ]
    },
    {
      id: "2",
      title: "Chemistry basics: Atoms",
      questions: 10,
      category: "Science",
      time: "1d ago",
      attempts: [],
      wrongQuestions: []
    },
    {
      id: "3",
      title: "Physics: Thermodynamics",
      questions: 8,
      category: "Science",
      time: "3d ago",
      attempts: [
        { id: "p1", score: 75, correct: 6, wrong: 2, skipped: 0, timestamp: Date.now() - 259200000 }
      ],
      wrongQuestions: [
        { id: "pq1", prompt: "What is the first law of thermodynamics related to?", selected: "Entropy", correct: "Conservation of energy" },
        { id: "pq2", prompt: "Which scale is used for absolute temperature?", selected: "Celsius", correct: "Kelvin" }
      ]
    },
    {
      id: "4",
      title: "Introduction to World War II",
      questions: 12,
      category: "History",
      time: "5d ago",
      attempts: [],
      wrongQuestions: []
    },
  ]);

  // Quiz Creator Form State
  const [newTitle, setNewTitle] = useState("");
  const [newCategory, setNewCategory] = useState("Science");
  const [newQuestionsCount, setNewQuestionsCount] = useState("5");

  const handleOpenQuizOptions = (quiz: any) => {
    setSelectedQuiz(quiz);
    setSelectionMode("all");
    setRandomCount(Math.min(5, quiz.questions));
    setRangeStart(1);
    setRangeEnd(quiz.questions);
    setShuffleQuestions(false);
    setShuffleAnswers(false);
    setShowAnswerOnSubmit(true);
    setTimePerQuestion(null);
  };

  const handleCreateQuiz = () => {
    if (!newTitle.trim()) {
      if (Platform.OS === "web") {
        alert("Please enter a quiz title.");
      } else {
        Alert.alert("Error", "Please enter a quiz title.");
      }
      return;
    }
    const newQuiz = {
      id: String(quizzes.length + 1),
      title: newTitle,
      questions: parseInt(newQuestionsCount) || 5,
      category: newCategory,
      time: "Just now",
      attempts: [],
      wrongQuestions: [],
    };
    setQuizzes([newQuiz, ...quizzes]);
    setNewTitle("");
    if (Platform.OS === "web") {
      alert(`Quiz "${newQuiz.title}" successfully created!`);
    } else {
      Alert.alert("Success", `Quiz "${newQuiz.title}" created successfully!`);
    }
    setActiveTab("dashboard");
  };

  // Render Sub-Views based on activeTab
  const renderContent = () => {
    switch (activeTab) {
      case "dashboard":
        return (
          <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            <View style={styles.tabHeader}>
              <Text style={styles.tabTitle}>Dashboard</Text>
              <Text style={styles.tabSubtitle}>Overview of your QuizForge activities</Text>
            </View>

            {/* Quick Stats Grid */}
            <View style={styles.statsGrid}>
              <View style={styles.statCard}>
                <View style={[styles.statIconContainer, { backgroundColor: "rgba(0, 229, 160, 0.1)" }]}>
                  <Ionicons name="book" size={20} color="#00e5a0" />
                </View>
                <Text style={styles.statValue}>{quizzes.length}</Text>
                <Text style={styles.statLabel}>Saved Quizzes</Text>
              </View>
              <View style={styles.statCard}>
                <View style={[styles.statIconContainer, { backgroundColor: "rgba(59, 130, 246, 0.1)" }]}>
                  <Ionicons name="checkmark-circle" size={20} color="#3b82f6" />
                </View>
                <Text style={styles.statValue}>24</Text>
                <Text style={styles.statLabel}>Attempts</Text>
              </View>
              <View style={styles.statCard}>
                <View style={[styles.statIconContainer, { backgroundColor: "rgba(168, 85, 247, 0.1)" }]}>
                  <Ionicons name="trophy" size={20} color="#a855f7" />
                </View>
                <Text style={styles.statValue}>84%</Text>
                <Text style={styles.statLabel}>Best Score</Text>
              </View>
              <View style={styles.statCard}>
                <View style={[styles.statIconContainer, { backgroundColor: "rgba(245, 158, 11, 0.1)" }]}>
                  <Ionicons name="flash" size={20} color="#f59e0b" />
                </View>
                <Text style={styles.statValue}>1,240</Text>
                <Text style={styles.statLabel}>XP Gained</Text>
              </View>
            </View>

            <Text style={styles.sectionHeading}>Recent Quizzes</Text>
            {quizzes.map((quiz) => (
              <View key={quiz.id} style={styles.quizCard}>
                <View style={styles.quizCardLeft}>
                  <View style={styles.quizAvatar}>
                    <Text style={styles.quizAvatarText}>{quiz.category[0]}</Text>
                  </View>
                  <View>
                    <Text style={styles.quizCardTitle}>{quiz.title}</Text>
                    <Text style={styles.quizCardMeta}>
                      {quiz.questions} Questions · {quiz.category}
                    </Text>
                  </View>
                </View>
                <Text style={styles.quizTime}>{quiz.time}</Text>
              </View>
            ))}
          </ScrollView>
        );

      case "add":
        return (
          <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            <View style={styles.tabHeader}>
              <Text style={styles.tabTitle}>Create Quiz</Text>
              <Text style={styles.tabSubtitle}>Setup a new custom MCQ quiz structure</Text>
            </View>

            <View style={styles.formContainer}>
              <Text style={styles.formLabel}>Quiz Title</Text>
              <Pressable style={styles.webInputDummy}>
                <TextInput
                  placeholder="e.g. Advanced Javascript"
                  placeholderTextColor="#666"
                  style={styles.formInput}
                  value={newTitle}
                  onChangeText={setNewTitle}
                />
              </Pressable>

              <Text style={styles.formLabel}>Category</Text>
              <View style={styles.categoryGrid}>
                {["Science", "History", "Coding", "General"].map((cat) => (
                  <Pressable
                    key={cat}
                    onPress={() => setNewCategory(cat)}
                    style={[
                      styles.categoryButton,
                      newCategory === cat && styles.categoryButtonActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.categoryButtonText,
                        newCategory === cat && styles.categoryButtonTextActive,
                      ]}
                    >
                      {cat}
                    </Text>
                  </Pressable>
                ))}
              </View>

              <Text style={styles.formLabel}>Questions Count</Text>
              <View style={styles.categoryGrid}>
                {["5", "10", "15", "20"].map((count) => (
                  <Pressable
                    key={count}
                    onPress={() => setNewQuestionsCount(count)}
                    style={[
                      styles.categoryButton,
                      newQuestionsCount === count && styles.categoryButtonActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.categoryButtonText,
                        newQuestionsCount === count && styles.categoryButtonTextActive,
                      ]}
                    >
                      {count} Items
                    </Text>
                  </Pressable>
                ))}
              </View>

              <Pressable onPress={handleCreateQuiz} style={styles.createButton}>
                <Text style={styles.createButtonText}>Create Quiz Structure</Text>
              </Pressable>
            </View>
          </ScrollView>
        );

      case "guide":
        return (
          <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            <View style={styles.tabHeader}>
              <Text style={styles.tabTitle}>How to Create a Quiz</Text>
              <Text style={styles.tabSubtitle}>Learn how to build, format, and load custom MCQ quizzes</Text>
            </View>

            {/* Video Tutorial Placeholder */}
            <Text style={styles.sectionHeading}>Watch Tutorial Video</Text>
            <Pressable
              onPress={() => {
                const url = "https://www.youtube.com/watch?v=dQw4w9WgXcQ"; // Placeholder YouTube link
                Linking.openURL(url).catch((err) => {
                  if (Platform.OS === "web") {
                    alert("Opening YouTube video: " + url);
                  } else {
                    Alert.alert("Open Video", "Opening video in browser...");
                  }
                });
              }}
              style={({ pressed }) => [styles.videoPlayerCard, pressed && styles.opacityPress]}
            >
              <View style={styles.videoThumbnailPlaceholder}>
                {/* Visual mock: dark background with red YouTube play button */}
                <View style={styles.youtubePlayCircle}>
                  <Ionicons name="play" size={24} color="#ffffff" style={{ marginLeft: 2 }} />
                </View>
                <Text style={styles.videoDurationBadge}>1:45</Text>
              </View>
              <View style={styles.videoCardDetails}>
                <Text style={styles.videoCardTitle}>Video: Formatting & Importing Quizzes</Text>
                <Text style={styles.videoCardSub}>Step-by-step video guide for teachers and students</Text>
              </View>
            </Pressable>

            {/* Format Instructions */}
            <Text style={styles.sectionHeading}>Step 1: Format Your Text File (.qst)</Text>
            <View style={styles.guideStepCard}>
              <Text style={styles.guideStepText}>
                QuizForge reads custom quizzes written in a simple text format. Create a plain text file ending in <Text style={{ color: "#00e5a0", fontWeight: "bold" }}>.qst</Text> and follow this layout:
              </Text>

              <View style={styles.codeBlockContainer}>
                <Text style={styles.codeLine}><Text style={styles.codeTag}>@title</Text>: World Geography Quiz</Text>
                <Text style={styles.codeLine}><Text style={styles.codeTag}>@category</Text>: Geography</Text>
                <Text style={styles.codeLine}></Text>
                <Text style={styles.codeLine}><Text style={styles.codeComment}># This is a comment</Text></Text>
                <Text style={styles.codeLine}><Text style={styles.codeTag}>?</Text> What is the capital of France?</Text>
                <Text style={styles.codeLine}><Text style={styles.codeWrong}>-</Text> Berlin</Text>
                <Text style={styles.codeLine}><Text style={styles.codeWrong}>-</Text> Madrid</Text>
                <Text style={styles.codeLine}><Text style={styles.codeAnswer}>+</Text> Paris</Text>
                <Text style={styles.codeLine}><Text style={styles.codeWrong}>-</Text> Rome</Text>
                <Text style={styles.codeLine}></Text>
                <Text style={styles.codeLine}><Text style={styles.codeTag}>?</Text> Name the muscle tone characteristic of children in the first months of life:</Text>
                <Text style={styles.codeLine}><Text style={styles.codeWrong}>-</Text> physiological hypotension of flexor muscles</Text>
                <Text style={styles.codeLine}><Text style={styles.codeWrong}>-</Text> decreased muscle tone in the hands</Text>
                <Text style={styles.codeLine}><Text style={styles.codeAnswer}>+</Text> physiological hypertension of flexor muscles</Text>
                <Text style={styles.codeLine}><Text style={styles.codeWrong}>-</Text> decreased muscle tone in the legs</Text>
              </View>
              
              <Text style={styles.guideStepTip}>
                <Ionicons name="bulb-outline" size={13} color="#00e5a0" style={{ marginRight: 4 }} /> Tip: Use '@key: value' for quiz parameters. Start questions with '?' and prefix answer choices with '+' (correct) and '-' (incorrect).
              </Text>
            </View>

            {/* Import Instructions */}
            <Text style={styles.sectionHeading}>Step 2: Create or Load in App</Text>
            <View style={styles.guideStepCard}>
              <View style={styles.stepItemRow}>
                <View style={styles.stepBadge}>
                  <Text style={styles.stepBadgeText}>1</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.stepItemTitle}>Tap the Add (+) Button</Text>
                  <Text style={styles.stepItemDesc}>Go to the center tab on the bottom menu to open the Quiz Creator.</Text>
                </View>
              </View>

              <View style={styles.stepItemRow}>
                <View style={styles.stepBadge}>
                  <Text style={styles.stepBadgeText}>2</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.stepItemTitle}>Define Quiz Settings</Text>
                  <Text style={styles.stepItemDesc}>Type in the title, choose a category, and specify the number of questions to draft your structure.</Text>
                </View>
              </View>

              <View style={[styles.stepItemRow, { borderBottomWidth: 0, paddingBottom: 0 }]}>
                <View style={styles.stepBadge}>
                  <Text style={styles.stepBadgeText}>3</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.stepItemTitle}>Play & Customize</Text>
                  <Text style={styles.stepItemDesc}>Select your quiz on the Home screen to configure options like Shuffle, range selection, or question timers, then play!</Text>
                </View>
              </View>
            </View>
          </ScrollView>
        );

      case "menu":
        return (
          <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            <View style={styles.tabHeader}>
              <Text style={styles.tabTitle}>Settings</Text>
              <Text style={styles.tabSubtitle}>Manage profile configurations and settings</Text>
            </View>

            {/* Profile Detail */}
            <View style={styles.profileSection}>
              <Image
                source={require("@/assets/images/puppy_avatar.png")}
                style={styles.profileDetailAvatar}
              />
              <Text style={styles.profileDetailName}>shashianand25</Text>
              <Text style={styles.profileDetailEmail}>shashianand25@slc</Text>
            </View>

            <View style={styles.menuList}>
              {[
                { label: "Notification Settings", icon: "notifications-outline" },
                { label: "App Appearance", icon: "color-palette-outline" },
                { label: "Linked Accounts & UPI", icon: "card-outline" },
                { label: "Help & Support Center", icon: "help-circle-outline" },
                { label: "Sign Out", icon: "log-out-outline", color: "#ef4444" },
              ].map((opt, idx) => (
                <Pressable
                  key={idx}
                  style={styles.menuItem}
                  onPress={() => {
                    if (opt.label === "Sign Out") {
                      if (Platform.OS === "web") alert("Signing out...");
                      else Alert.alert("Sign Out", "Are you sure you want to sign out?");
                    }
                  }}
                >
                  <View style={styles.menuItemLeft}>
                    <Ionicons name={opt.icon as any} size={20} color={opt.color || "#ccc"} />
                    <Text style={[styles.menuItemText, opt.color && { color: opt.color }]}>
                      {opt.label}
                    </Text>
                  </View>
                  <Feather name="chevron-right" size={16} color="#444" />
                </Pressable>
              ))}
            </View>
          </ScrollView>
        );

      default:
        // "home" quizzes list view
        return (
          <View style={styles.homeContainer}>
            {/* Header Content */}
            <View style={styles.topHeaderBar}>
              <Text style={styles.homeLogoText}>QuizForge</Text>

              <View style={styles.topHeaderRight}>
                <Pressable style={({ pressed }) => [styles.chatIconButton, pressed && styles.opacityPress]}>
                  <Ionicons name="chatbubble-outline" size={22} color="#ffffff" />
                </Pressable>

                <Pressable
                  onPress={() => setActiveTab("menu")}
                  style={({ pressed }) => [styles.avatarButton, pressed && styles.opacityPress]}
                >
                  <Image
                    source={require("@/assets/images/puppy_avatar.png")}
                    style={styles.headerAvatar}
                  />
                </Pressable>
              </View>
            </View>

            {/* Scrollable list of quizzes or empty welcome state */}
            <ScrollView
              style={styles.homeScroll}
              contentContainerStyle={styles.homeScrollContent}
              showsVerticalScrollIndicator={false}
            >
              {quizzes.length > 0 ? (
                <>
                  <Text style={styles.homeGreeting}>Hello, Shashi Anand</Text>
                  <Text style={styles.homeSectionTitle}>Your Active Quizzes</Text>
                  {quizzes.map((quiz) => (
                    <Pressable
                      key={quiz.id}
                      onPress={() => handleOpenQuizOptions(quiz)}
                      style={({ pressed }) => [styles.quizCard, pressed && styles.opacityPress]}
                    >
                      <View style={styles.quizCardLeft}>
                        <View style={styles.quizAvatar}>
                          <Text style={styles.quizAvatarText}>{quiz.category[0]}</Text>
                        </View>
                        <View style={{ flex: 1, paddingRight: 8 }}>
                          <Text style={styles.quizCardTitle} numberOfLines={1}>
                            {quiz.title}
                          </Text>
                          <Text style={styles.quizCardMeta}>
                            {quiz.questions} Questions · {quiz.category}
                          </Text>
                        </View>
                      </View>
                      <Feather name="chevron-right" size={18} color="#6e727a" />
                    </Pressable>
                  ))}
                </>
              ) : (
                <View style={styles.emptyWelcomeContainer}>
                  <View style={styles.emptyIconCircle}>
                    <Ionicons name="school" size={40} color="#00e5a0" />
                  </View>
                  <Text style={styles.emptyTitle}>Welcome to QuizForge!</Text>
                  <Text style={styles.emptyDesc}>
                    You don't have any quizzes in your library yet.
                  </Text>
                  <View style={styles.emptyActionHint}>
                    <Text style={styles.emptyActionText}>
                      Click on the <Text style={{ color: "#00e5a0", fontWeight: "bold" }}>+</Text> button in the center of the menu below to add your first quiz!
                    </Text>
                    <Ionicons name="arrow-down-outline" size={24} color="#00e5a0" style={styles.arrowDownAnimation} />
                  </View>
                </View>
              )}
            </ScrollView>
          </View>
        );
    }
  };

  return (
    <SafeAreaView style={styles.rootContainer} edges={["top", "left", "right"]}>
      {/* Dynamic Screen Area */}
      <View style={styles.screenContainer}>{renderContent()}</View>

      {/* Custom Bottom Tab Navigation Bar */}
      <View style={[styles.bottomTabBar, { paddingBottom: Math.max(insets.bottom, 12) }]}>
        {/* Tab 1: Home page (Banking Grid UI) */}
        <Pressable onPress={() => setActiveTab("home")} style={styles.tabItem}>
          <Ionicons
            name={activeTab === "home" ? "home" : "home-outline"}
            size={24}
            color={activeTab === "home" ? "#ffffff" : "#6e727a"}
          />
        </Pressable>

        {/* Tab 2: Dashboard */}
        <Pressable onPress={() => setActiveTab("dashboard")} style={styles.tabItem}>
          <Feather
            name="layers"
            size={24}
            color={activeTab === "dashboard" ? "#ffffff" : "#6e727a"}
          />
        </Pressable>

        {/* Tab 3: Center Plus button (double ring) */}
        <View style={styles.centerTabContainer}>
          <Pressable
            onPress={() => setActiveTab("add")}
            style={({ pressed }) => [
              styles.centerOuterRing,
              pressed && styles.centerRingPressed,
              activeTab === "add" && styles.centerOuterActive,
            ]}
          >
            <View style={styles.centerInnerCircle}>
              <Feather name="plus" size={24} color="#000000" />
            </View>
          </Pressable>
        </View>

        {/* Tab 4: Guide */}
        <Pressable onPress={() => setActiveTab("guide")} style={styles.tabItem}>
          <Ionicons
            name={activeTab === "guide" ? "play-circle" : "play-circle-outline"}
            size={24}
            color={activeTab === "guide" ? "#ffffff" : "#6e727a"}
          />
        </Pressable>

        {/* Tab 5: Menu */}
        <Pressable onPress={() => setActiveTab("menu")} style={styles.tabItem}>
          <Feather
            name="menu"
            size={24}
            color={activeTab === "menu" ? "#ffffff" : "#6e727a"}
          />
        </Pressable>
      </View>

      {/* Quiz Options Popup Modal (Matches Website Options) */}
      <Modal
        visible={selectedQuiz !== null}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setSelectedQuiz(null)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.quizOptionsCard}>
            {/* Header */}
            <View style={styles.optionsHeader}>
              <View style={{ flex: 1, marginRight: 8 }}>
                <Text style={styles.optionsTitle} numberOfLines={1}>
                  {selectedQuiz?.title}
                </Text>
                <Text style={styles.optionsSubtitle}>
                  {selectedQuiz?.category} · {totalQuestions} Questions Available
                </Text>
              </View>
              <Pressable
                onPress={() => setSelectedQuiz(null)}
                style={styles.optionsCloseButton}
              >
                <Feather name="x" size={20} color="#888888" />
              </Pressable>
            </View>

            <ScrollView
              style={styles.optionsScroll}
              contentContainerStyle={styles.optionsScrollContent}
              showsVerticalScrollIndicator={false}
            >
              {/* Question Selection Section */}
              <Text style={styles.optionsSectionTitle}>Question Selection</Text>
              <View style={styles.sectionCard}>
                {[
                  { value: "all" as const, label: "All questions", sub: `${totalQuestions} questions` },
                  { value: "random" as const, label: "Random pick", sub: "Choose how many" },
                  { value: "range" as const, label: "Question range", sub: `From Q1 to Q${totalQuestions}` },
                  {
                    value: "unanswered" as const,
                    label: "Unanswered only",
                    sub: unansweredCount > 0 ? `${unansweredCount} remaining` : "No session yet",
                    disabled: unansweredCount === 0,
                  },
                  {
                    value: "wrong" as const,
                    label: "Wrong answers",
                    sub: wrongCount > 0 ? `${wrongCount} questions` : "No session yet",
                    disabled: wrongCount === 0,
                  },
                ].map(({ value, label, sub, disabled }) => {
                  const isActive = selectionMode === value;
                  return (
                    <View key={value} style={styles.optionRowContainer}>
                      <Pressable
                        disabled={disabled}
                        onPress={() => setSelectionMode(value)}
                        style={styles.radioOptionRow}
                      >
                        <View
                          style={[
                            styles.radioCircle,
                            isActive && styles.radioCircleActive,
                            disabled && styles.radioCircleDisabled,
                          ]}
                        >
                          {isActive && <View style={styles.radioDot} />}
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text
                            style={[
                              styles.radioLabel,
                              disabled && styles.radioTextDisabled,
                            ]}
                          >
                            {label}
                          </Text>
                          <Text style={styles.radioSub}>{sub}</Text>
                        </View>
                      </Pressable>

                      {/* Steppers inline when active */}
                      {value === "random" && isActive && (
                        <View style={styles.inlineControlsContainer}>
                          <Stepper
                            value={randomCount}
                            min={1}
                            max={totalQuestions}
                            onChange={(val) => setRandomCount(val)}
                          />
                        </View>
                      )}

                      {value === "range" && isActive && (
                        <View style={styles.inlineControlsContainer}>
                          <View style={styles.rangeStepperGroup}>
                            <Stepper
                              value={rangeStart}
                              min={1}
                              max={rangeEnd}
                              onChange={(val) => setRangeStart(val)}
                            />
                            <Text style={styles.rangeToText}>to</Text>
                            <Stepper
                              value={rangeEnd}
                              min={rangeStart}
                              max={totalQuestions}
                              onChange={(val) => setRangeEnd(val)}
                            />
                          </View>
                        </View>
                      )}
                    </View>
                  );
                })}
              </View>

              {/* Timer Section */}
              <Text style={styles.optionsSectionTitle}>Timer</Text>
              <View style={styles.sectionCard}>
                <View style={styles.switchRow}>
                  <View style={styles.switchRowLeft}>
                    <View style={[styles.iconBox, { backgroundColor: "rgba(59, 130, 246, 0.1)", borderColor: "rgba(59, 130, 246, 0.2)" }]}>
                      <Ionicons name="time" size={16} color="#3b82f6" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.switchLabel}>Time per question</Text>
                      <Text style={styles.switchSub}>
                        {timePerQuestion ? `${timePerQuestion} seconds limit` : "No time limit"}
                      </Text>
                    </View>
                  </View>
                  <ToggleSwitch
                    checked={timePerQuestion !== null}
                    onChange={(checked) => setTimePerQuestion(checked ? 30 : null)}
                  />
                </View>

                {timePerQuestion !== null && (
                  <View style={styles.stepperSubRow}>
                    <Text style={styles.stepperSubRowText}>Seconds per question</Text>
                    <Stepper
                      value={timePerQuestion}
                      min={5}
                      max={120}
                      step={5}
                      suffix="s"
                      onChange={(val) => setTimePerQuestion(val)}
                    />
                  </View>
                )}
              </View>

              {/* Gameplay Options Section */}
              <Text style={styles.optionsSectionTitle}>Gameplay Options</Text>
              <View style={styles.sectionCard}>
                {[
                  {
                    icon: "shuffle" as const,
                    iconType: "Feather" as const,
                    color: "#a855f7",
                    label: "Shuffle question order",
                    sub: "Questions appear in random order",
                    value: shuffleQuestions,
                    onChange: setShuffleQuestions,
                  },
                  {
                    icon: "repeat" as const,
                    iconType: "Feather" as const,
                    color: "#3b82f6",
                    label: "Shuffle answer options",
                    sub: "Answer choices appear in random order",
                    value: shuffleAnswers,
                    onChange: setShuffleAnswers,
                  },
                  {
                    icon: "checkmark-done-circle" as const,
                    iconType: "Ionicons" as const,
                    color: "#00e5a0",
                    label: "Show answer after submit",
                    sub: "Highlight correct answer when you answer",
                    value: showAnswerOnSubmit,
                    onChange: setShowAnswerOnSubmit,
                  },
                ].map(({ icon, iconType, color, label, sub, value, onChange }, idx) => (
                  <View
                    key={idx}
                    style={[
                      styles.switchRow,
                      idx < 2 && { borderBottomWidth: 1, borderBottomColor: "rgba(255, 255, 255, 0.04)" },
                    ]}
                  >
                    <View style={styles.switchRowLeft}>
                      <View style={[styles.iconBox, { backgroundColor: `${color}18`, borderColor: `${color}28` }]}>
                        {iconType === "Feather" ? (
                          <Feather name={icon as any} size={16} color={color} />
                        ) : (
                          <Ionicons name={icon as any} size={16} color={color} />
                        )}
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.switchLabel}>{label}</Text>
                        <Text style={styles.switchSub}>{sub}</Text>
                      </View>
                    </View>
                    <ToggleSwitch checked={value} onChange={onChange} />
                  </View>
                ))}
              </View>

              {/* Ready to Start Summary Card */}
              <View style={styles.summaryCard}>
                <View style={styles.summaryHeader}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                    <Ionicons name="list" size={18} color="#00e5a0" />
                    <Text style={styles.summaryTitle}>Ready to start</Text>
                  </View>
                  <Text style={styles.summaryQuestionCount}>{questionCount}</Text>
                </View>
                
                <Text style={styles.summaryText}>
                  {questionCount} question{questionCount !== 1 ? "s" : ""} ·{" "}
                  {shuffleQuestions ? "shuffled" : "in order"} ·{" "}
                  {timePerQuestion ? `${timePerQuestion}s per question` : "no time limit"}
                </Text>

                {questionCount === 0 && (
                  <View style={styles.warningBox}>
                    <Ionicons name="warning" size={16} color="#f59e0b" style={{ marginRight: 6 }} />
                    <Text style={styles.warningText}>No questions match selection</Text>
                  </View>
                )}

                <Pressable
                  disabled={questionCount === 0}
                  onPress={() => {
                    setSelectedQuiz(null);
                    const timerInfo = timePerQuestion ? `${timePerQuestion}s limit` : "No limit";
                    const msg = `Starting quiz: "${selectedQuiz?.title}"\n\nConfig:\n- Selection Mode: ${selectionMode} (${questionCount} qs)\n- Timer: ${timerInfo}\n- Shuffle Questions: ${shuffleQuestions ? "Yes" : "No"}\n- Shuffle Answers: ${shuffleAnswers ? "Yes" : "No"}\n- Show Answer: ${showAnswerOnSubmit ? "Yes" : "No"}`;
                    if (Platform.OS === "web") {
                      alert(msg);
                    } else {
                      Alert.alert("Start Quiz", msg);
                    }
                  }}
                  style={({ pressed }) => [
                    styles.startQuizBtn,
                    questionCount === 0 && styles.startQuizBtnDisabled,
                    pressed && styles.opacityPress,
                  ]}
                >
                  <Ionicons name="play" size={18} color="#000000" />
                  <Text style={styles.startQuizBtnText}>Start Quiz</Text>
                </Pressable>
              </View>

              {/* Quiz Actions (Delete and Export only) */}
              <Text style={styles.optionsSectionTitle}>Quiz Actions</Text>
              <View style={styles.quizActionsContainer}>
                <Pressable
                  onPress={() => {
                    const msg = `Exporting QST file for "${selectedQuiz?.title}"...`;
                    if (Platform.OS === "web") alert(msg);
                    else Alert.alert("Export QST", msg);
                  }}
                  style={({ pressed }) => [styles.actionBtnRow, pressed && styles.opacityPress]}
                >
                  <Ionicons name="download-outline" size={16} color="#cccccc" />
                  <Text style={styles.actionBtnRowText}>Export QST Format</Text>
                </Pressable>

                <Pressable
                  onPress={() => {
                    const deleteQuizAction = () => {
                      setQuizzes(quizzes.filter(q => q.id !== selectedQuiz.id));
                      setSelectedQuiz(null);
                    };

                    if (Platform.OS === "web") {
                      if (confirm(`Are you sure you want to delete "${selectedQuiz?.title}"?`)) {
                        deleteQuizAction();
                      }
                    } else {
                      Alert.alert(
                        "Delete Quiz",
                        `Are you sure you want to delete "${selectedQuiz?.title}"?`,
                        [
                          { text: "Cancel", style: "cancel" },
                          { text: "Delete", style: "destructive", onPress: deleteQuizAction }
                        ]
                      );
                    }
                  }}
                  style={({ pressed }) => [
                    styles.actionBtnRow,
                    { borderColor: "rgba(239, 68, 68, 0.15)" },
                    pressed && styles.opacityPress,
                  ]}
                >
                  <Ionicons name="trash-outline" size={16} color="#ef4444" />
                  <Text style={[styles.actionBtnRowText, { color: "#ef4444" }]}>Delete Quiz</Text>
                </Pressable>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  rootContainer: {
    flex: 1,
    backgroundColor: "#000000",
  },
  screenContainer: {
    flex: 1,
  },
  homeContainer: {
    flex: 1,
    paddingHorizontal: 20,
    paddingBottom: 10,
  },
  topHeaderBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 12,
    height: 60,
    marginBottom: 16,
  },
  homeLogoText: {
    color: "#ffffff",
    fontSize: 22,
    fontWeight: "bold",
    letterSpacing: -0.5,
  },
  topHeaderRight: {
    flexDirection: "row",
    alignItems: "center",
  },
  chatIconButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  avatarButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    overflow: "hidden",
  },
  headerAvatar: {
    width: "100%",
    height: "100%",
  },
  homeScroll: {
    flex: 1,
  },
  homeScrollContent: {
    paddingBottom: 24,
  },
  homeGreeting: {
    fontSize: 14,
    color: "#6e727a",
  },
  homeSectionTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#ffffff",
    marginTop: 4,
    marginBottom: 18,
  },
  quizCardRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  playBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#00e5a0",
    alignItems: "center",
    justifyContent: "center",
  },
  deleteBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(239, 68, 68, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(239, 68, 68, 0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  emptyWelcomeContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 50,
    paddingHorizontal: 16,
  },
  emptyIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "rgba(0, 229, 160, 0.1)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#ffffff",
    marginBottom: 8,
  },
  emptyDesc: {
    fontSize: 14,
    color: "#888888",
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 8,
  },
  emptyActionHint: {
    marginTop: 32,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255, 255, 255, 0.03)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.06)",
    padding: 20,
    borderRadius: 20,
    width: "100%",
  },
  emptyActionText: {
    fontSize: 14,
    color: "#cccccc",
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 12,
  },
  arrowDownAnimation: {
    marginTop: 4,
  },
  quizOptionsCard: {
    backgroundColor: "#0d0f14",
    borderRadius: 24,
    padding: 20,
    width: SCREEN_WIDTH - 32,
    maxHeight: "85%",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    alignSelf: "center",
  },
  optionsHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.06)",
    paddingBottom: 16,
    marginBottom: 16,
  },
  optionsTitle: {
    color: "#ffffff",
    fontSize: 18,
    fontWeight: "bold",
  },
  optionsSubtitle: {
    color: "#6e727a",
    fontSize: 13,
    marginTop: 2,
  },
  optionsCloseButton: {
    padding: 4,
  },
  optionsScroll: {
    flex: 1,
  },
  optionsScrollContent: {
    paddingBottom: 16,
  },
  optionsSectionTitle: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#6e727a",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginTop: 16,
    marginBottom: 12,
  },
  sectionCard: {
    backgroundColor: "rgba(255, 255, 255, 0.03)",
    borderColor: "rgba(255, 255, 255, 0.06)",
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    marginBottom: 8,
  },
  optionRowContainer: {
    marginBottom: 12,
  },
  radioOptionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "rgba(255, 255, 255, 0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  radioCircleActive: {
    borderColor: "#00e5a0",
    backgroundColor: "#00e5a0",
  },
  radioCircleDisabled: {
    borderColor: "rgba(255, 255, 255, 0.05)",
    opacity: 0.4,
  },
  radioDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#0d0f14",
  },
  radioLabel: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "500",
  },
  radioTextDisabled: {
    color: "rgba(255, 255, 255, 0.2)",
  },
  radioSub: {
    color: "#6e727a",
    fontSize: 11,
    marginTop: 2,
  },
  inlineControlsContainer: {
    marginTop: 8,
    paddingLeft: 32,
  },
  rangeStepperGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  rangeToText: {
    color: "#6e727a",
    fontSize: 12,
  },
  stepperContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.04)",
    borderColor: "rgba(255, 255, 255, 0.08)",
    borderWidth: 1,
    borderRadius: 8,
    height: 36,
  },
  stepperBtn: {
    width: 36,
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  stepperBtnDisabled: {
    opacity: 0.3,
  },
  stepperValueContainer: {
    width: 48,
    alignItems: "center",
    justifyContent: "center",
    borderLeftWidth: 1,
    borderLeftColor: "rgba(255, 255, 255, 0.06)",
    borderRightWidth: 1,
    borderRightColor: "rgba(255, 255, 255, 0.06)",
    height: "100%",
  },
  stepperValueText: {
    color: "#00e5a0",
    fontWeight: "bold",
    fontSize: 13,
  },
  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
  },
  switchRowLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
    marginRight: 12,
  },
  iconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  switchLabel: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "500",
  },
  switchSub: {
    color: "#6e727a",
    fontSize: 11,
    marginTop: 2,
  },
  stepperSubRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.04)",
  },
  stepperSubRowText: {
    color: "#6e727a",
    fontSize: 13,
  },
  summaryCard: {
    backgroundColor: "rgba(0, 229, 160, 0.04)",
    borderColor: "rgba(0, 229, 160, 0.15)",
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    marginTop: 16,
    marginBottom: 8,
  },
  summaryHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  summaryTitle: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "600",
  },
  summaryQuestionCount: {
    color: "#00e5a0",
    fontSize: 22,
    fontWeight: "bold",
  },
  summaryText: {
    color: "#6e727a",
    fontSize: 12,
    marginBottom: 12,
  },
  warningBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(245, 158, 11, 0.08)",
    borderColor: "rgba(245, 158, 11, 0.2)",
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
  },
  warningText: {
    color: "#f59e0b",
    fontSize: 12,
  },
  startQuizBtn: {
    backgroundColor: "#00e5a0",
    height: 48,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    shadowColor: "#00e5a0",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  startQuizBtnDisabled: {
    backgroundColor: "rgba(255, 255, 255, 0.06)",
    shadowOpacity: 0,
    opacity: 0.4,
  },
  startQuizBtnText: {
    color: "#000000",
    fontWeight: "bold",
    fontSize: 15,
  },
  quizActionsContainer: {
    gap: 8,
  },
  actionBtnRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "rgba(255, 255, 255, 0.03)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.06)",
    height: 44,
    borderRadius: 12,
    paddingHorizontal: 16,
    marginBottom: 4,
  },
  actionBtnRowText: {
    color: "#cccccc",
    fontSize: 14,
    fontWeight: "500",
  },
  bottomTabBar: {
    flexDirection: "row",
    backgroundColor: "#000000",
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.05)",
    paddingTop: 12,
    height: 80,
    alignItems: "center",
  },
  tabItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  centerTabContainer: {
    flex: 1.2,
    alignItems: "center",
    justifyContent: "center",
  },
  centerOuterRing: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 2,
    borderColor: "#ffffff",
    padding: 3,
    alignItems: "center",
    justifyContent: "center",
  },
  centerOuterActive: {
    borderColor: "#00e5a0",
  },
  centerRingPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.96 }],
  },
  centerInnerCircle: {
    backgroundColor: "#ffffff",
    width: "100%",
    height: "100%",
    borderRadius: 27,
    alignItems: "center",
    justifyContent: "center",
  },
  opacityPress: {
    opacity: 0.7,
  },
  switchContainer: {
    width: 44,
    height: 26,
    borderRadius: 13,
    padding: 3,
    justifyContent: "center",
  },
  switchCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#ffffff",
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 40,
  },
  tabHeader: {
    marginBottom: 24,
  },
  tabTitle: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#ffffff",
  },
  tabSubtitle: {
    fontSize: 14,
    color: "#888888",
    marginTop: 4,
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    backgroundColor: "rgba(255, 255, 255, 0.04)",
    borderColor: "rgba(255, 255, 255, 0.06)",
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    width: (SCREEN_WIDTH - 52) / 2,
  },
  statIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  statValue: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#ffffff",
  },
  statLabel: {
    fontSize: 12,
    color: "#666666",
    marginTop: 2,
  },
  sectionHeading: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#ffffff",
    marginBottom: 16,
    marginTop: 8,
  },
  quizCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "rgba(255, 255, 255, 0.04)",
    borderColor: "rgba(255, 255, 255, 0.06)",
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  quizCardLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  quizAvatar: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  quizAvatarText: {
    color: "#ffffff",
    fontWeight: "bold",
  },
  quizCardTitle: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "600",
  },
  quizCardMeta: {
    color: "#666666",
    fontSize: 12,
    marginTop: 2,
  },
  quizTime: {
    color: "#666666",
    fontSize: 12,
  },
  formContainer: {
    gap: 16,
  },
  formLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#ffffff",
    marginTop: 8,
  },
  webInputDummy: {
    backgroundColor: "rgba(255, 255, 255, 0.06)",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    paddingHorizontal: 16,
    height: 48,
    justifyContent: "center",
  },
  formInput: {
    color: "#ffffff",
    fontSize: 15,
    width: "100%",
  },
  categoryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  categoryButton: {
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderColor: "rgba(255, 255, 255, 0.08)",
    borderWidth: 1,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
  },
  categoryButtonActive: {
    backgroundColor: "#00e5a0",
    borderColor: "#00e5a0",
  },
  categoryButtonText: {
    color: "#cccccc",
    fontSize: 13,
    fontWeight: "500",
  },
  categoryButtonTextActive: {
    color: "#000000",
    fontWeight: "bold",
  },
  createButton: {
    backgroundColor: "#00e5a0",
    height: 52,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 24,
    shadowColor: "#00e5a0",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
  },
  createButtonText: {
    color: "#000000",
    fontSize: 16,
    fontWeight: "bold",
  },
  videoPlayerCard: {
    backgroundColor: "rgba(255, 255, 255, 0.03)",
    borderColor: "rgba(255, 255, 255, 0.06)",
    borderWidth: 1,
    borderRadius: 16,
    overflow: "hidden",
    marginBottom: 20,
  },
  videoThumbnailPlaceholder: {
    height: 160,
    backgroundColor: "#16181e",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  youtubePlayCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#ff0000",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#ff0000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
  },
  videoDurationBadge: {
    position: "absolute",
    bottom: 8,
    right: 8,
    backgroundColor: "rgba(0, 0, 0, 0.8)",
    color: "#ffffff",
    fontSize: 11,
    fontWeight: "600",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  videoCardDetails: {
    padding: 12,
  },
  videoCardTitle: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "bold",
  },
  videoCardSub: {
    color: "#6e727a",
    fontSize: 11,
    marginTop: 2,
  },
  guideStepCard: {
    backgroundColor: "rgba(255, 255, 255, 0.03)",
    borderColor: "rgba(255, 255, 255, 0.06)",
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
  },
  guideStepText: {
    color: "#cccccc",
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 12,
  },
  codeBlockContainer: {
    backgroundColor: "rgba(0, 0, 0, 0.3)",
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.04)",
  },
  codeLine: {
    color: "#b0b4bc",
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
    fontSize: 12,
    lineHeight: 16,
  },
  codeTag: {
    color: "#ff79c6",
    fontWeight: "600",
  },
  codeAnswer: {
    color: "#00e5a0",
    fontWeight: "600",
  },
  codeComment: {
    color: "#6272a4",
    fontStyle: "italic",
  },
  codeWrong: {
    color: "#ff5555",
    fontWeight: "600",
  },
  guideStepTip: {
    color: "#888888",
    fontSize: 11,
    fontStyle: "italic",
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
  },
  stepItemRow: {
    flexDirection: "row",
    gap: 12,
    paddingBottom: 16,
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.04)",
  },
  stepBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "rgba(0, 229, 160, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(0, 229, 160, 0.2)",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  stepBadgeText: {
    color: "#00e5a0",
    fontSize: 12,
    fontWeight: "bold",
  },
  stepItemTitle: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "600",
  },
  stepItemDesc: {
    color: "#6e727a",
    fontSize: 12,
    lineHeight: 16,
    marginTop: 4,
  },
  profileSection: {
    alignItems: "center",
    marginBottom: 32,
  },
  profileDetailAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 2,
    borderColor: "rgba(255, 255, 255, 0.1)",
    marginBottom: 12,
  },
  profileDetailName: {
    color: "#ffffff",
    fontSize: 20,
    fontWeight: "bold",
  },
  profileDetailEmail: {
    color: "#666666",
    fontSize: 13,
    marginTop: 2,
  },
  menuList: {
    backgroundColor: "rgba(255, 255, 255, 0.03)",
    borderColor: "rgba(255, 255, 255, 0.06)",
    borderWidth: 1,
    borderRadius: 20,
    padding: 8,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
  },
  menuItemLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  menuItemText: {
    color: "#dddddd",
    fontSize: 15,
    fontWeight: "500",
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.75)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#0d0f14",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 10,
    paddingHorizontal: 24,
    paddingBottom: 40,
    borderColor: "rgba(255, 255, 255, 0.08)",
    borderTopWidth: 1,
  },
  modalDragHandle: {
    width: 40,
    height: 5,
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    borderRadius: 3,
    alignSelf: "center",
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#ffffff",
    marginBottom: 24,
  },
  balanceDetailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.06)",
  },
  balanceDetailLabel: {
    color: "#999999",
    fontSize: 14,
  },
  balanceDetailValue: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "bold",
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
  },
  bankDetailContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "rgba(255, 255, 255, 0.04)",
    borderRadius: 16,
    padding: 16,
    marginTop: 24,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.06)",
  },
  bankDetailLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  bankName: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "bold",
  },
  bankMeta: {
    color: "#666666",
    fontSize: 11,
    marginTop: 2,
  },
  modalCloseButton: {
    backgroundColor: "#ffffff",
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 28,
  },
  modalCloseButtonText: {
    color: "#000000",
    fontSize: 15,
    fontWeight: "bold",
  },
  dialogCard: {
    backgroundColor: "#0d0f14",
    borderRadius: 24,
    padding: 24,
    width: SCREEN_WIDTH - 48,
    alignSelf: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
  },
  dialogIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  dialogTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#ffffff",
    marginBottom: 8,
  },
  dialogDescription: {
    fontSize: 14,
    color: "#999999",
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 16,
  },
  dialogAmount: {
    fontSize: 36,
    fontWeight: "bold",
    color: "#ffffff",
    marginBottom: 24,
  },
  dialogButtons: {
    flexDirection: "row",
    gap: 12,
  },
  dialogCancel: {
    flex: 1,
    borderColor: "rgba(255, 255, 255, 0.15)",
    borderWidth: 1,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  dialogCancelText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "bold",
  },
  dialogConfirm: {
    flex: 1,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  dialogConfirmText: {
    color: "#000000",
    fontSize: 14,
    fontWeight: "bold",
  },
});
