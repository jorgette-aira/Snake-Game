import { useEffect, useMemo, useRef, useState } from "react";
import {
  Dimensions,
  GestureResponderEvent,
  Modal,
  PanResponder,
  PanResponderGestureState,
  Platform,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

interface Point {
  x: number;
  y: number;
}

interface Particle {
  id: number;
  x: number;
  y: number;
  size: number;
  opacity: number;
  color: string;
}

type GameMode = "SPEED" | "CHILL";

const DIRECTIONS: Record<string, Point> = {
  UP: { x: 0, y: -1 },
  DOWN: { x: 0, y: 1 },
  LEFT: { x: -1, y: 0 },
  RIGHT: { x: 1, y: 0 },
};

const INITIAL_SNAKE: Point[] = [
  { x: 5, y: 5 },
  { x: 4, y: 5 },
  { x: 3, y: 5 },
];

const BORDER_WIDTH = 3;

const BUBBLE_COLORS = [
  "#3b82f6",
  "#60a5fa",
  "#06b6d4",
  "#06d474",
  "#4ade80",
  "#10b981",
  "#ffffff",
  "#f8fafc",
];

export default function SnakeGame() {
  const [screenDimensions, setScreenDimensions] = useState(
    Dimensions.get("window"),
  );

  useEffect(() => {
    const subscription = Dimensions.addEventListener("change", ({ window }) => {
      setScreenDimensions(window);
    });
    return () => subscription?.remove();
  }, []);

  const { width: screenWidth, height: screenHeight } = screenDimensions;
  const isLandscape = screenWidth > screenHeight;

  // Scale Factor for Mobile vs Tablet/Laptop
  const CELL_SIZE = useMemo(() => {
    const minDimension = Math.min(screenWidth, screenHeight);

    if (Platform.OS === "web") {
      if (minDimension > 900) return 42;
      if (minDimension > 600) return 36;
      return 24;
    }

    if (minDimension > 550) {
      return 38;
    }

    return 20;
  }, [screenWidth, screenHeight]);

  const GRID_COLS = isLandscape ? 30 : 16;
  const GRID_ROWS = isLandscape ? 12 : 26;

  const INNER_WIDTH = GRID_COLS * CELL_SIZE;
  const INNER_HEIGHT = GRID_ROWS * CELL_SIZE;

  const TOTAL_WIDTH = INNER_WIDTH + BORDER_WIDTH * 2;
  const TOTAL_HEIGHT = INNER_HEIGHT + BORDER_WIDTH * 2;

  // Background Ambient Particles
  const backgroundParticles = useMemo<Particle[]>(() => {
    const particles: Particle[] = [];
    const count = 60;
    for (let i = 0; i < count; i++) {
      particles.push({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 100,
        size: Math.floor(Math.random() * 16) + 4,
        opacity: Math.random() * 0.5 + 0.15,
        color: BUBBLE_COLORS[Math.floor(Math.random() * BUBBLE_COLORS.length)],
      });
    }
    return particles;
  }, [screenDimensions]);

  // --- Game State ---
  const [isInHome, setIsInHome] = useState<boolean>(true);
  const [isModeModalOpen, setIsModeModalOpen] = useState<boolean>(false);
  const [gameMode, setGameMode] = useState<GameMode>("SPEED");
  const [snake, setSnake] = useState<Point[]>(INITIAL_SNAKE);
  const [foods, setFoods] = useState<Point[]>([{ x: 10, y: 10 }]);
  const [direction, setDirection] = useState<Point>(DIRECTIONS.RIGHT);
  const [isGameOver, setIsGameOver] = useState<boolean>(false);
  const [score, setScore] = useState<number>(0);
  const [highScore, setHighScore] = useState<number>(0);
  const [isMenuOpen, setIsMenuOpen] = useState<boolean>(false);

  const directionRef = useRef<Point>(direction);
  directionRef.current = direction;

  const hasSwiped = useRef<boolean>(false);

  // Grid background pattern tiles
  const gridCells = useMemo(() => {
    const cells = [];
    for (let r = 0; r < GRID_ROWS; r++) {
      for (let c = 0; c < GRID_COLS; c++) {
        const isEven = (r + c) % 2 === 0;
        cells.push({
          row: r,
          col: c,
          color: isEven ? "#0a131a" : "#0d1b24",
        });
      }
    }
    return cells;
  }, [GRID_ROWS, GRID_COLS]);

  const generateSingleFoodPosition = (
    currentSnake: Point[],
    existingFoods: Point[],
  ): Point => {
    let candidate: Point;
    while (true) {
      candidate = {
        x: Math.floor(Math.random() * GRID_COLS),
        y: Math.floor(Math.random() * GRID_ROWS),
      };

      const isOnSnake = currentSnake.some(
        (seg) => seg.x === candidate.x && seg.y === candidate.y,
      );
      const isOnOtherFood = existingFoods.some(
        (f) => f.x === candidate.x && f.y === candidate.y,
      );

      if (!isOnSnake && !isOnOtherFood) break;
    }
    return candidate;
  };

  const changeDirection = (newDir: Point) => {
    const current = directionRef.current;
    if (
      (newDir === DIRECTIONS.UP && current !== DIRECTIONS.DOWN) ||
      (newDir === DIRECTIONS.DOWN && current !== DIRECTIONS.UP) ||
      (newDir === DIRECTIONS.LEFT && current !== DIRECTIONS.RIGHT) ||
      (newDir === DIRECTIONS.RIGHT && current !== DIRECTIONS.LEFT)
    ) {
      setDirection(newDir);
    }
  };

  // Full Screen Touch Controls
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () =>
        !isMenuOpen && !isGameOver && !isInHome && !isModeModalOpen,
      onMoveShouldSetPanResponder: () =>
        !isMenuOpen && !isGameOver && !isInHome && !isModeModalOpen,
      onPanResponderGrant: () => {
        hasSwiped.current = false;
      },
      onPanResponderMove: (
        _evt: GestureResponderEvent,
        gestureState: PanResponderGestureState,
      ) => {
        if (
          hasSwiped.current ||
          isMenuOpen ||
          isGameOver ||
          isInHome ||
          isModeModalOpen
        )
          return;

        const { dx, dy } = gestureState;
        const absX = Math.abs(dx);
        const absY = Math.abs(dy);

        if (Math.max(absX, absY) > 10) {
          if (absX > absY) {
            if (dx > 0) changeDirection(DIRECTIONS.RIGHT);
            else changeDirection(DIRECTIONS.LEFT);
          } else {
            if (dy > 0) changeDirection(DIRECTIONS.DOWN);
            else changeDirection(DIRECTIONS.UP);
          }
          hasSwiped.current = true;
        }
      },
    }),
  ).current;

  // Keyboard Controls
  useEffect(() => {
    if (Platform.OS !== "web") return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (isInHome || isModeModalOpen) return;

      switch (e.key) {
        case "ArrowUp":
        case "w":
        case "W":
          if (!isMenuOpen) changeDirection(DIRECTIONS.UP);
          break;
        case "ArrowDown":
        case "s":
        case "S":
          if (!isMenuOpen) changeDirection(DIRECTIONS.DOWN);
          break;
        case "ArrowLeft":
        case "a":
        case "A":
          if (!isMenuOpen) changeDirection(DIRECTIONS.LEFT);
          break;
        case "ArrowRight":
        case "d":
        case "D":
          if (!isMenuOpen) changeDirection(DIRECTIONS.RIGHT);
          break;
        case "Escape":
        case "p":
        case "P":
          setIsMenuOpen((prev) => !prev);
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isMenuOpen, isInHome, isModeModalOpen]);

  // Main Game Loop - Handles SPEED vs CHILL logic
  useEffect(() => {
    if (isGameOver || isMenuOpen || isInHome || isModeModalOpen) return;

    const moveSnake = () => {
      setSnake((prevSnake) => {
        const head = prevSnake[0];
        const currentDir = directionRef.current;
        const newHead: Point = {
          x: head.x + currentDir.x,
          y: head.y + currentDir.y,
        };

        if (
          newHead.x < 0 ||
          newHead.x >= GRID_COLS ||
          newHead.y < 0 ||
          newHead.y >= GRID_ROWS
        ) {
          setIsGameOver(true);
          return prevSnake;
        }

        if (
          prevSnake.some(
            (segment) => segment.x === newHead.x && segment.y === newHead.y,
          )
        ) {
          setIsGameOver(true);
          return prevSnake;
        }

        const newSnake = [newHead, ...prevSnake];

        const eatenIndex = foods.findIndex(
          (food) => food.x === newHead.x && food.y === newHead.y,
        );

        if (eatenIndex !== -1) {
          const nextScore = score + 10;
          setScore(nextScore);
          if (nextScore > highScore) setHighScore(nextScore);

          const updatedFoods = foods.filter((_, idx) => idx !== eatenIndex);
          const replacement = generateSingleFoodPosition(
            newSnake,
            updatedFoods,
          );
          updatedFoods.push(replacement);

          const targetAppleCount = Math.min(5, 1 + Math.floor(nextScore / 30));

          if (updatedFoods.length < targetAppleCount) {
            const extraApple = generateSingleFoodPosition(
              newSnake,
              updatedFoods,
            );
            updatedFoods.push(extraApple);
          }

          setFoods(updatedFoods);
        } else {
          newSnake.pop();
        }

        return newSnake;
      });
    };

    const speed =
      gameMode === "SPEED"
        ? Math.max(70, 200 - Math.floor(score / 30) * 4)
        : 200;

    const interval = setInterval(moveSnake, speed);
    return () => clearInterval(interval);
  }, [
    foods,
    isGameOver,
    isMenuOpen,
    isInHome,
    isModeModalOpen,
    gameMode,
    score,
    highScore,
    GRID_COLS,
    GRID_ROWS,
  ]);

  const startGameWithMode = (mode: GameMode) => {
    setGameMode(mode);
    setSnake(INITIAL_SNAKE);
    setDirection(DIRECTIONS.RIGHT);
    setScore(0);
    setIsGameOver(false);
    setIsMenuOpen(false);
    setFoods([{ x: 10, y: 10 }]);
    setIsModeModalOpen(false);
    setIsInHome(false);
  };

  const resetGame = () => {
    setSnake(INITIAL_SNAKE);
    setDirection(DIRECTIONS.RIGHT);
    setScore(0);
    setIsGameOver(false);
    setIsMenuOpen(false);
    setIsInHome(false);
    setFoods([{ x: 10, y: 10 }]);
  };

  const handleHomeAction = () => {
    setSnake(INITIAL_SNAKE);
    setDirection(DIRECTIONS.RIGHT);
    setScore(0);
    setIsGameOver(false);
    setIsMenuOpen(false);
    setIsModeModalOpen(false);
    setIsInHome(true);
    setFoods([{ x: 10, y: 10 }]);
  };

  // Explicit Corner Radii Calculation for Head
  const getHeadCornerRadii = () => {
    const half = CELL_SIZE / 2;
    if (direction.x === 1) {
      return {
        borderTopRightRadius: half,
        borderBottomRightRadius: half,
        borderTopLeftRadius: 0,
        borderBottomLeftRadius: 0,
      };
    }
    if (direction.x === -1) {
      return {
        borderTopLeftRadius: half,
        borderBottomLeftRadius: half,
        borderTopRightRadius: 0,
        borderBottomRightRadius: 0,
      };
    }
    if (direction.y === -1) {
      return {
        borderTopLeftRadius: half,
        borderTopRightRadius: half,
        borderBottomLeftRadius: 0,
        borderBottomRightRadius: 0,
      };
    }
    if (direction.y === 1) {
      return {
        borderBottomLeftRadius: half,
        borderBottomRightRadius: half,
        borderTopLeftRadius: 0,
        borderTopRightRadius: 0,
      };
    }
    return {
      borderTopRightRadius: half,
      borderBottomRightRadius: half,
    };
  };

  // Explicit Corner Radii Calculation for Tail
  const getTailCornerRadii = () => {
    const half = CELL_SIZE / 2;
    if (snake.length < 2) return { borderRadius: half };
    const tail = snake[snake.length - 1];
    const prev = snake[snake.length - 2];

    const dx = tail.x - prev.x;
    const dy = tail.y - prev.y;

    if (dx === 1) {
      return {
        borderTopRightRadius: half,
        borderBottomRightRadius: half,
        borderTopLeftRadius: 0,
        borderBottomLeftRadius: 0,
      };
    }
    if (dx === -1) {
      return {
        borderTopLeftRadius: half,
        borderBottomLeftRadius: half,
        borderTopRightRadius: 0,
        borderBottomRightRadius: 0,
      };
    }
    if (dy === 1) {
      return {
        borderBottomLeftRadius: half,
        borderBottomRightRadius: half,
        borderTopLeftRadius: 0,
        borderTopRightRadius: 0,
      };
    }
    if (dy === -1) {
      return {
        borderTopLeftRadius: half,
        borderTopRightRadius: half,
        borderBottomLeftRadius: 0,
        borderBottomRightRadius: 0,
      };
    }
    return { borderRadius: half };
  };

  return (
    <SafeAreaView style={styles.container} {...panResponder.panHandlers}>
      {/* Background Floating Ambient Particles / Bubbles */}
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        {backgroundParticles.map((p) => (
          <View
            key={`bubble-${p.id}`}
            style={{
              position: "absolute",
              left: `${p.x}%`,
              top: `${p.y}%`,
              width: p.size,
              height: p.size,
              borderRadius: p.size / 2,
              backgroundColor: p.color,
              opacity: p.opacity,
              shadowColor: p.color,
              shadowOffset: { width: 0, height: 0 },
              shadowOpacity: 0.85,
              shadowRadius: p.size / 2,
            }}
          />
        ))}
      </View>

      {/* Clean Home Screen */}
      {isInHome ? (
        <View style={styles.homeContainer}>
          <Text style={styles.homeTitle}>SNAKE</Text>

          <TouchableOpacity
            style={styles.playButton}
            onPress={() => setIsModeModalOpen(true)}
            activeOpacity={0.8}
          >
            <Text style={styles.playButtonText}>PLAY</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          {/* Score Header Capsule with Menu Gear Icon */}
          <View style={[styles.scoreCapsule, { width: TOTAL_WIDTH }]}>
            <View style={styles.scoreGroup}>
              <Text
                style={[
                  styles.scoreText,
                  { fontSize: CELL_SIZE > 24 ? 18 : 14 },
                ]}
              >
                SCORE: {score}
              </Text>
              <View style={styles.divider} />
              <Text
                style={[
                  styles.highScoreText,
                  { fontSize: CELL_SIZE > 24 ? 18 : 14 },
                ]}
              >
                BEST: {highScore}
              </Text>
              <View style={styles.divider} />
              <Text style={styles.modeBadgeText}>
                {gameMode === "SPEED" ? "SPEED" : "CHILL"}
              </Text>
            </View>

            {/* Cyber Menu / Gear Button */}
            <TouchableOpacity
              style={styles.menuIconButton}
              onPress={() => setIsMenuOpen(true)}
              activeOpacity={0.7}
            >
              <Text style={styles.gearIcon}>⚙️</Text>
            </TouchableOpacity>
          </View>

          {/* Game Board Container */}
          <View
            style={[styles.board, { width: TOTAL_WIDTH, height: TOTAL_HEIGHT }]}
          >
            <View
              style={{
                width: INNER_WIDTH,
                height: INNER_HEIGHT,
                position: "relative",
              }}
            >
              {/* Cyber Checkered Tiles */}
              {gridCells.map((cell) => (
                <View
                  key={`${cell.row}-${cell.col}`}
                  style={{
                    position: "absolute",
                    left: cell.col * CELL_SIZE,
                    top: cell.row * CELL_SIZE,
                    width: CELL_SIZE,
                    height: CELL_SIZE,
                    backgroundColor: cell.color,
                    borderWidth: 0.5,
                    borderColor: "rgba(6, 182, 212, 0.08)",
                  }}
                />
              ))}

              {/* Cyber Snake Rendering - Perfectly rounded Pill Head & Tail */}
              {snake.map((segment, index) => {
                const isHead = index === 0;
                const isTail = index === snake.length - 1;

                if (isHead) {
                  const eyeSize = Math.max(4, Math.floor(CELL_SIZE * 0.22));
                  const pupilSize = Math.max(2, Math.floor(eyeSize * 0.5));
                  const eyeOffset = Math.max(3, Math.floor(CELL_SIZE * 0.18));

                  let rotationAngle = "0deg";
                  if (direction.x === -1) rotationAngle = "180deg";
                  if (direction.y === -1) rotationAngle = "270deg";
                  if (direction.y === 1) rotationAngle = "90deg";

                  return (
                    <View
                      key={index}
                      style={[
                        styles.snakeSegmentContainer,
                        {
                          width: CELL_SIZE,
                          height: CELL_SIZE,
                          left: segment.x * CELL_SIZE,
                          top: segment.y * CELL_SIZE,
                        },
                      ]}
                    >
                      <View
                        style={[styles.snakeHeadShape, getHeadCornerRadii()]}
                      >
                        <View
                          style={{
                            width: "100%",
                            height: "100%",
                            position: "relative",
                            transform: [{ rotate: rotationAngle }],
                          }}
                        >
                          <View
                            style={[
                              styles.eyeTop,
                              {
                                top: eyeOffset,
                                right: eyeOffset + 2,
                                width: eyeSize,
                                height: eyeSize,
                                borderRadius: eyeSize / 2,
                              },
                            ]}
                          >
                            <View
                              style={[
                                styles.pupil,
                                {
                                  width: pupilSize,
                                  height: pupilSize,
                                  borderRadius: pupilSize / 2,
                                },
                              ]}
                            />
                          </View>
                          <View
                            style={[
                              styles.eyeBottom,
                              {
                                bottom: eyeOffset,
                                right: eyeOffset + 2,
                                width: eyeSize,
                                height: eyeSize,
                                borderRadius: eyeSize / 2,
                              },
                            ]}
                          >
                            <View
                              style={[
                                styles.pupil,
                                {
                                  width: pupilSize,
                                  height: pupilSize,
                                  borderRadius: pupilSize / 2,
                                },
                              ]}
                            />
                          </View>
                          <View style={styles.tongueLine}>
                            <View style={styles.forkTop} />
                            <View style={styles.forkBottom} />
                          </View>
                        </View>
                      </View>
                    </View>
                  );
                }

                if (isTail) {
                  return (
                    <View
                      key={index}
                      style={[
                        styles.snakeSegmentContainer,
                        {
                          width: CELL_SIZE,
                          height: CELL_SIZE,
                          left: segment.x * CELL_SIZE,
                          top: segment.y * CELL_SIZE,
                        },
                      ]}
                    >
                      <View
                        style={[styles.snakeTailShape, getTailCornerRadii()]}
                      />
                    </View>
                  );
                }

                return (
                  <View
                    key={index}
                    style={[
                      styles.snakeBodyShape,
                      {
                        width: CELL_SIZE,
                        height: CELL_SIZE,
                        left: segment.x * CELL_SIZE,
                        top: segment.y * CELL_SIZE,
                      },
                    ]}
                  />
                );
              })}

              {/* Cyber Energy Orbs */}
              {foods.map((food, index) => (
                <View
                  key={`food-${index}`}
                  style={[
                    styles.foodApple,
                    {
                      width: CELL_SIZE,
                      height: CELL_SIZE,
                      left: food.x * CELL_SIZE,
                      top: food.y * CELL_SIZE,
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.orbRing,
                      {
                        width: CELL_SIZE - 2,
                        height: CELL_SIZE - 2,
                        borderRadius: (CELL_SIZE - 2) / 2,
                      },
                    ]}
                  />
                  <View
                    style={[
                      styles.orbCore,
                      {
                        width: CELL_SIZE - 6,
                        height: CELL_SIZE - 6,
                        borderRadius: (CELL_SIZE - 6) / 2,
                      },
                    ]}
                  />
                  <View style={styles.orbGlow} />
                </View>
              ))}
            </View>

            {/* Cyber Game Over Overlay */}
            {isGameOver && (
              <View style={styles.overlay}>
                <Text style={styles.gameOverTitle}>GAME OVER</Text>
                <Text style={styles.finalScore}>SCORE: {score}</Text>
                <TouchableOpacity style={styles.button} onPress={resetGame}>
                  <Text style={styles.buttonText}>TRY AGAIN</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </>
      )}

      {/* Mode Selection Popup Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={isModeModalOpen}
        onRequestClose={() => setIsModeModalOpen(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modeModalContainer}>
            <Text style={styles.modeModalTitle}>SELECT MODE</Text>
            <Text style={styles.modeModalSubtitle}>CHOOSE YOUR CHALLENGE</Text>

            <TouchableOpacity
              style={[styles.modeCard, styles.speedCard]}
              onPress={() => startGameWithMode("SPEED")}
              activeOpacity={0.8}
            >
              <Text style={styles.modeCardTitle}>⚡ SPEED MODE</Text>
              <Text style={styles.modeCardDesc}>
                Snake gets faster after eating apples!
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.modeCard, styles.chillCard]}
              onPress={() => startGameWithMode("CHILL")}
              activeOpacity={0.8}
            >
              <Text style={styles.modeCardTitle}>☕ CHILL MODE</Text>
              <Text style={styles.modeCardDesc}>
                Relaxed constant speed for endless fun!
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => setIsModeModalOpen(false)}
            >
              <Text style={styles.cancelButtonText}>CANCEL</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Borderless Overlay Pause Menu */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={isMenuOpen}
        onRequestClose={() => setIsMenuOpen(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.menuContainer}>
            <Text style={styles.menuTitle}>PAUSED</Text>
            <Text style={styles.menuSubtitle}>SYSTEM STANDBY MODE</Text>

            <TouchableOpacity
              style={[styles.menuBtn, styles.resumeBtn]}
              onPress={() => setIsMenuOpen(false)}
            >
              <Text style={styles.resumeBtnText}>RESUME</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.menuBtn, styles.restartBtn]}
              onPress={resetGame}
            >
              <Text style={styles.restartBtnText}>RESTART</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.menuBtn, styles.homeBtn]}
              onPress={handleHomeAction}
            >
              <Text style={styles.homeBtnText}>HOME</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#030712",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
  },

  // Home Screen Styles
  homeContainer: {
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10,
  },
  homeTitle: {
    fontSize: 36,
    fontWeight: "900",
    color: "#06d474",
    letterSpacing: 4,
    marginBottom: 40,
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
    textShadowColor: "rgba(6, 212, 116, 0.6)",
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 15,
  },
  playButton: {
    backgroundColor: "#06d474",
    paddingHorizontal: 48,
    paddingVertical: 18,
    borderRadius: 50,
    borderWidth: 2,
    borderColor: "#34d399",
    shadowColor: "#06d474",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 20,
    elevation: 12,
  },
  playButtonText: {
    color: "#030712",
    fontSize: 20,
    fontWeight: "900",
    letterSpacing: 2,
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
  },

  // Mode Selection Popup Modal
  modeModalContainer: {
    width: "85%",
    maxWidth: 320,
    backgroundColor: "#0a131a",
    borderRadius: 20,
    borderWidth: 2,
    borderColor: "#06d474",
    padding: 24,
    alignItems: "center",
    shadowColor: "#06d474",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 15,
    elevation: 10,
  },
  modeModalTitle: {
    fontSize: 22,
    fontWeight: "900",
    color: "#06d474",
    letterSpacing: 2,
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
  },
  modeModalSubtitle: {
    fontSize: 11,
    color: "#64748b",
    marginBottom: 20,
    letterSpacing: 1,
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
  },
  modeCard: {
    width: "100%",
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  speedCard: {
    backgroundColor: "rgba(6, 212, 116, 0.1)",
    borderColor: "#06d474",
  },
  chillCard: {
    backgroundColor: "rgba(56, 189, 248, 0.1)",
    borderColor: "#38bdf8",
  },
  modeCardTitle: {
    fontSize: 16,
    fontWeight: "900",
    color: "#ffffff",
    marginBottom: 4,
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
  },
  modeCardDesc: {
    fontSize: 12,
    color: "#94a3b8",
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
  },
  cancelButton: {
    marginTop: 8,
    paddingVertical: 8,
  },
  cancelButtonText: {
    color: "#64748b",
    fontSize: 13,
    fontWeight: "700",
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
  },

  // Score Header Capsule
  scoreCapsule: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginBottom: 16,
    borderRadius: 50,
    borderWidth: BORDER_WIDTH,
    borderColor: "#06d474",
    backgroundColor: "#0a131a",
    shadowColor: "#06d474",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 10,
    elevation: 8,
    zIndex: 10,
  },
  scoreGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  divider: {
    width: 2,
    height: 16,
    backgroundColor: "rgba(6, 212, 116, 0.3)",
  },
  scoreText: {
    color: "#4ade80",
    fontWeight: "800",
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
  },
  highScoreText: {
    color: "#f59e0b",
    fontWeight: "800",
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
  },
  modeBadgeText: {
    color: "#38bdf8",
    fontWeight: "800",
    fontSize: 12,
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
  },

  // Menu Button
  menuIconButton: {
    backgroundColor: "#102a20",
    borderRadius: 20,
    padding: 6,
    borderWidth: 1,
    borderColor: "#06d474",
    alignItems: "center",
    justifyContent: "center",
  },
  gearIcon: {
    fontSize: 16,
  },

  // Board
  board: {
    position: "relative",
    borderRadius: 8,
    borderWidth: BORDER_WIDTH,
    borderColor: "#06d474",
    overflow: "hidden",
    shadowColor: "#06d474",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 10,
    elevation: 8,
    zIndex: 10,
  },

  snakeSegmentContainer: {
    position: "absolute",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 5,
  },

  snakeHeadShape: {
    width: "100%",
    height: "100%",
    backgroundColor: "#10b981",
    borderWidth: 1,
    borderColor: "#a7f3d0",
    position: "relative",
    overflow: "hidden",
  },
  eyeTop: {
    position: "absolute",
    backgroundColor: "#ffffff",
    justifyContent: "center",
    alignItems: "center",
  },
  eyeBottom: {
    position: "absolute",
    backgroundColor: "#ffffff",
    justifyContent: "center",
    alignItems: "center",
  },
  pupil: {
    backgroundColor: "#030712",
  },
  tongueLine: {
    position: "absolute",
    right: -5,
    top: "50%",
    marginTop: -1,
    width: 6,
    height: 2,
    backgroundColor: "#ec4899",
  },
  forkTop: {
    position: "absolute",
    right: 0,
    top: -2,
    width: 3,
    height: 2,
    backgroundColor: "#ec4899",
    transform: [{ rotate: "-45deg" }],
  },
  forkBottom: {
    position: "absolute",
    right: 0,
    bottom: -2,
    width: 3,
    height: 2,
    backgroundColor: "#ec4899",
    transform: [{ rotate: "45deg" }],
  },

  snakeBodyShape: {
    position: "absolute",
    backgroundColor: "#059669",
    borderWidth: 1,
    borderColor: "#34d399",
    borderRadius: 0,
    zIndex: 2,
  },

  snakeTailShape: {
    width: "100%",
    height: "100%",
    backgroundColor: "#059669",
    borderWidth: 1,
    borderColor: "#34d399",
    overflow: "hidden",
  },

  foodApple: {
    position: "absolute",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 3,
  },
  orbCore: {
    backgroundColor: "#f43f5e",
    borderWidth: 1,
    borderColor: "#fda4af",
  },
  orbRing: {
    position: "absolute",
    borderWidth: 1,
    borderColor: "rgba(244, 63, 94, 0.5)",
  },
  orbGlow: {
    position: "absolute",
    top: 4,
    left: 4,
    width: 3,
    height: 3,
    backgroundColor: "#ffffff",
    borderRadius: 1.5,
  },

  overlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(3, 7, 18, 0.92)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10,
  },
  gameOverTitle: {
    fontSize: 28,
    fontWeight: "900",
    color: "#f43f5e",
    marginBottom: 8,
    letterSpacing: 2,
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
  },
  finalScore: {
    fontSize: 16,
    color: "#94a3b8",
    marginBottom: 20,
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
  },
  button: {
    backgroundColor: "#06d474",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: "#06d474",
  },
  buttonText: {
    color: "#030712",
    fontSize: 15,
    fontWeight: "900",
    letterSpacing: 1,
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
  },

  // Borderless Overlay Menu Styles
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(3, 7, 18, 0.85)",
    justifyContent: "center",
    alignItems: "center",
  },
  menuContainer: {
    width: "80%",
    maxWidth: 280,
    alignItems: "center",
  },
  menuTitle: {
    fontSize: 28,
    fontWeight: "900",
    color: "#06d474",
    letterSpacing: 3,
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
  },
  menuSubtitle: {
    fontSize: 12,
    color: "#64748b",
    marginBottom: 32,
    letterSpacing: 1.5,
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
  },
  menuBtn: {
    width: "100%",
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: "center",
    marginBottom: 16,
    borderWidth: 1,
  },
  resumeBtn: {
    backgroundColor: "#06d474",
    borderColor: "#34d399",
  },
  resumeBtnText: {
    color: "#030712",
    fontSize: 15,
    fontWeight: "900",
    letterSpacing: 1,
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
  },
  restartBtn: {
    backgroundColor: "rgba(10, 19, 26, 0.9)",
    borderColor: "#06d474",
  },
  restartBtnText: {
    color: "#4ade80",
    fontSize: 15,
    fontWeight: "900",
    letterSpacing: 1,
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
  },
  homeBtn: {
    backgroundColor: "rgba(10, 19, 26, 0.9)",
    borderColor: "#f59e0b",
    marginBottom: 0,
  },
  homeBtnText: {
    color: "#f59e0b",
    fontSize: 15,
    fontWeight: "900",
    letterSpacing: 1,
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
  },
});
