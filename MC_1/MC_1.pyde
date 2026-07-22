
# State Variables
current_skin = "steve"
current_anim = "idle"

# Camera Controls
rot_x = radians(-15)  # Slightly looking down initially
rot_y = radians(35)   # Isometric starting angle
zoom = -50.0          # Camera distance adjustment

# Texture colors definitions matching the Web counterpart
skins = {
    "steve": {
        "skin": (224, 169, 140),
        "hair": (63, 41, 26),
        "eyes": (60, 60, 180),
        "mouth": (140, 80, 60),
        "shirt": (0, 163, 163),
        "pants": (60, 68, 170),
        "shoes": (70, 70, 70),
        "sleeveWidth": 16
    },
    "alex": {
        "skin": (230, 180, 150),
        "hair": (220, 110, 40),
        "eyes": (80, 140, 80),
        "mouth": (170, 90, 80),
        "shirt": (120, 160, 60),
        "pants": (130, 90, 60),
        "shoes": (50, 40, 40),
        "sleeveWidth": 12 # Alex's slender arm width
    },
    "zombie": {
        "skin": (90, 150, 85),
        "hair": (50, 90, 50),
        "eyes": (20, 20, 20),
        "mouth": (40, 60, 40),
        "shirt": (0, 160, 160),
        "pants": (100, 70, 130),
        "shoes": (40, 40, 40),
        "sleeveWidth": 16
    }
}

def setup():
    size(800, 600, P3D)
    frameRate(60)
    noStroke()

def draw():
    global rot_x, rot_y, zoom, current_skin, current_anim
    
    background(15, 23, 42) # Slate-900 background color
    
    # 1. Lights setup for rich 3D volumes
    ambientLight(100, 105, 120)
    directionalLight(255, 255, 255, 0.5, 0.8, -0.4)
    directionalLight(120, 150, 220, -0.8, -0.2, 0.4)
    
    # 2. 3D Camera Transformations
    pushMatrix()
    translate(width/2, height/2 - 50, zoom)
    rotateX(rot_x)
    rotateY(rot_y)
    scale(2.0) # Adjust initial scaling to fit nicely
    
    # Slow idle rotating presentation effect (can be overridden by user drag)
    if not mousePressed:
        rot_y += 0.005
        
    # Setup joint rotations based on keyframe animations
    head_rot = 0.0
    left_arm_rot = 0.0
    right_arm_rot = 0.0
    left_leg_rot = 0.0
    right_leg_rot = 0.0
    wave_angle = 0.0
    
    t = frameCount * 0.08
    
    if current_anim == "walk":
        # Realistic opposite walking motions
        left_leg_rot = sin(t) * 0.7
        right_leg_rot = -sin(t) * 0.7
        left_arm_rot = -sin(t) * 0.7
        right_arm_rot = sin(t) * 0.7
        head_rot = sin(t * 2) * 0.05
    elif current_anim == "wave":
        # Waving right arm up high
        right_arm_rot = -2.2
        left_arm_rot = sin(frameCount * 0.05) * 0.15
        wave_angle = sin(frameCount * 0.2) * 0.3
        head_rot = 0.1
    else: # idle breathing mode
        breathe = sin(frameCount * 0.04) * 0.05
        head_rot = breathe * 0.5
        right_arm_rot = breathe
        left_arm_rot = -breathe
        
    skin = skins[current_skin]
    
    # --- 1. TORSO (Center Pivot) ---
    pushMatrix()
    fill(skin["shirt"][0], skin["shirt"][1], skin["shirt"][2])
    stroke(30, 40, 50, 50)
    box(40, 60, 20)
    popMatrix()
    
    # --- 2. HEAD (Pivot on neck: Y = -30) ---
    pushMatrix()
    translate(0, -30, 0)
    rotateY(head_rot * 0.5)
    rotateX(head_rot)
    translate(0, -20, 0) # Draw half of head height upward from neck joint
    
    # Head skin skinBox
    fill(skin["skin"][0], skin["skin"][1], skin["skin"][2])
    box(40, 40, 40)
    
    # Hair helmet overlay
    pushMatrix()
    translate(0, -5, 1)
    fill(skin["hair"][0], skin["hair"][1], skin["hair"][2])
    box(42, 32, 42)
    popMatrix()
    
    # Eyes
    pushMatrix()
    fill(255)
    translate(-10, 0, 20.5)
    box(8, 4, 1)
    fill(skin["eyes"][0], skin["eyes"][1], skin["eyes"][2])
    translate(-1, 0, 0.5)
    box(4, 4, 1)
    popMatrix()
    
    pushMatrix()
    fill(255)
    translate(10, 0, 20.5)
    box(8, 4, 1)
    fill(skin["eyes"][0], skin["eyes"][1], skin["eyes"][2])
    translate(1, 0, 0.5)
    box(4, 4, 1)
    popMatrix()
    
    # Mouth
    pushMatrix()
    fill(skin["mouth"][0], skin["mouth"][1], skin["mouth"][2])
    translate(0, 10, 20.5)
    box(12, 6, 1)
    popMatrix()
    
    popMatrix() # Close Head
    
    # --- 3. RIGHT ARM (Pivot on Shoulder: X = 28, Y = -22) ---
    pushMatrix()
    translate(28, -22, 0)
    rotateX(right_arm_rot)
    rotateZ(wave_angle)
    translate(0, 18, 0) # translate pivot downward
    
    # Sleeve
    fill(skin["shirt"][0], skin["shirt"][1], skin["shirt"][2])
    box(skin["sleeveWidth"], 24, 16)
    
    # Hand
    pushMatrix()
    translate(0, 17, 0)
    fill(skin["skin"][0], skin["skin"][1], skin["skin"][2])
    box(skin["sleeveWidth"] - 0.2, 16, 15.8)
    popMatrix()
    
    popMatrix() # Close Right Arm
    
    # --- 4. LEFT ARM (Pivot on Shoulder: X = -28, Y = -22) ---
    pushMatrix()
    translate(-28, -22, 0)
    rotateX(left_arm_rot)
    translate(0, 18, 0)
    
    # Sleeve
    fill(skin["shirt"][0], skin["shirt"][1], skin["shirt"][2])
    box(skin["sleeveWidth"], 24, 16)
    
    # Hand
    pushMatrix()
    translate(0, 17, 0)
    fill(skin["skin"][0], skin["skin"][1], skin["skin"][2])
    box(skin["sleeveWidth"] - 0.2, 16, 15.8)
    popMatrix()
    
    popMatrix() # Close Left Arm
    
    # --- 5. RIGHT LEG (Pivot on Hip: X = 10, Y = 30) ---
    pushMatrix()
    translate(10, 30, 0)
    rotateX(right_leg_rot)
    translate(0, 20, 0)
    
    # Pants
    fill(skin["pants"][0], skin["pants"][1], skin["pants"][2])
    box(18, 28, 18)
    
    # Shoes
    pushMatrix()
    translate(0, 20, 0)
    fill(skin["shoes"][0], skin["shoes"][1], skin["shoes"][2])
    box(17.8, 14, 17.8)
    popMatrix()
    
    popMatrix() # Close Right Leg
    
    # --- 6. LEFT LEG (Pivot on Hip: X = -10, Y = 30) ---
    pushMatrix()
    translate(-10, 30, 0)
    rotateX(left_leg_rot)
    translate(0, 20, 0)
    
    # Pants
    fill(skin["pants"][0], skin["pants"][1], skin["pants"][2])
    box(18, 28, 18)
    
    # Shoes
    pushMatrix()
    translate(0, 20, 0)
    fill(skin["shoes"][0], skin["shoes"][1], skin["shoes"][2])
    box(17.8, 14, 17.8)
    popMatrix()
    
    popMatrix() # Close Left Leg
    
    popMatrix() # Exit main 3D matrix
    
    # Draw 2D HUD (instructions overlayed on top)
    drawHUD()

# Render 2D User HUD & Instructions
def drawHUD():
    pushStyle()
    hint(DISABLE_DEPTH_TEST) # turn off depth buffer to render text clearly on top
    camera()                 # reset camera mapping to standard 2D overlay coordinate
    
    # Left HUD Banner
    fill(10, 15, 30, 180)
    stroke(30, 41, 59)
    rect(15, 15, 320, 210, 10)
    
    # Instructions Header
    fill(99, 102, 241) # Indigo-500
    textSize(15)
    text("MINECRAFT 3D BUILDER (PC)", 30, 40)
    
    # Key Mapping Guide
    fill(203, 213, 225)
    textSize(11)
    text("[1] [2] [3] Key : Change Skin Preset", 30, 70)
    text("[Q] [W] [E] Key : Change Animation", 30, 95)
    text("Mouse Drag    : Rotate Camera (Orbit)", 30, 120)
    text("Mouse Wheel   : Camera Zoom In/Out", 30, 145)
    
    # Current Active Status
    fill(34, 197, 94) # Emerald Green
    text("Active Skin : " + current_skin.upper(), 30, 180)
    text("Active Anim : " + current_anim.upper(), 30, 200)
    
    hint(ENABLE_DEPTH_TEST) # restore default depth rendering for next frame
    popStyle()

# Dragging Mouse orbits the 3D object
def mouseDragged():
    global rot_x, rot_y
    # Sensitivity factor: 0.01 radians per pixel moved
    rot_y += (mouseX - pmouseX) * 0.01
    rot_x -= (mouseY - pmouseY) * 0.01

# Mouse wheel zooms camera in or out
def mouseWheel(event):
    global zoom
    zoom += event.getCount() * -10.0

# Key presses triggers GUI reactions
def keyPressed():
    global current_skin, current_anim
    
    # Skin selection keys
    if key == '1':
        current_skin = "steve"
    elif key == '2':
        current_skin = "alex"
    elif key == '3':
        current_skin = "zombie"
        
    # Animation selection keys
    if key == 'q' or key == 'Q':
        current_anim = "idle"
    elif key == 'w' or key == 'W':
        current_anim = "walk"
    elif key == 'e' or key == 'E':
        current_anim = "wave"
