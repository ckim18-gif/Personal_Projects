# Desktop Processing (Python Mode) - Complete Interactive 3D Minecraft Character with Physics Movement
from java.lang import System
System.setProperty("apple.awt.UIElement", "true")

# Presets skin color definitions (RGB)
skins = {
    "steve": {
        "skin": [224, 169, 140],
        "hair": [63, 41, 26],
        "eyes": [60, 60, 180],
        "mouth": [140, 80, 60],
        "shirt": [0, 163, 163],
        "pants": [60, 68, 170],
        "shoes": [70, 70, 70],
        "skinLight": [235, 185, 160],
        "sleeveWidth": 16
    },
    "alex": {
        "skin": [230, 180, 150],
        "hair": [220, 110, 40],
        "eyes": [80, 140, 80],
        "mouth": [170, 90, 80],
        "shirt": [120, 160, 60],
        "pants": [130, 90, 60],
        "shoes": [50, 40, 40],
        "skinLight": [240, 195, 170],
        "sleeveWidth": 12 
    },
    "zombie": {
        "skin": [90, 150, 85],
        "hair": [50, 90, 50],
        "eyes": [20, 20, 20],
        "mouth": [40, 60, 40],
        "shirt": [0, 160, 160],
        "pants": [100, 70, 130],
        "shoes": [40, 40, 40],
        "skinLight": [110, 170, 105],
        "sleeveWidth": 16
    }
}

# Active interactive state variables
current_skin = "steve"
current_anim = "idle"

# Camera Controls
cam_rot_x = -0.4
cam_rot_y = 0.5
cam_zoom = 1.0

# Player position & Rotation variables
px = 0.0
pz = 0.0
player_speed = 3.5
player_angle = 0.0        # Current angle player is facing
target_angle = 0.0        # Target angle player wants to face (smooth rotation)

# Active key press states for smooth physics movement
key_up = False
key_down = False
key_left = False
key_right = False

def setup():
    size(700, 700, P3D) # High-res 3D Canvas
    frameRate(60)

def draw():
    background(15, 23, 42) # slate-900 backplane
    
    # Update movement and angle calculations
    updateMovement()
    
    # Setup rich 3D lighting environment
    ambientLight(130, 130, 145)
    directionalLight(255, 255, 255, 0.5, 1.0, -0.3) # Sunlight
    directionalLight(100, 130, 200, -0.8, -0.2, 0.5) # Soft bounce fill light

    # Apply Global Camera Transformations
    pushMatrix()
    translate(width / 2, height / 2 - 20, 100) # Center the world view
    scale(cam_zoom * 2.5) # Adjust global scale
    rotateX(cam_rot_x)
    rotateY(cam_rot_y)
    
    # Draw 3D Ground Grid Floor
    drawGround()

    # Apply Player Position & Rotations
    pushMatrix()
    translate(px, 0, pz) # Move character inside 3D space
    rotateY(player_angle) # Face moving direction

    # Determine Joint Angle Parameters (Animation Engine)
    t = frameCount * 0.15 # Faster animation speed for running
    head_rot = 0
    left_arm_rot = 0
    right_arm_rot = 0
    left_leg_rot = 0
    right_leg_rot = 0
    wave_angle = 0

    if current_anim == "walk":
        # Dynamic active movement swing
        left_leg_rot = sin(t) * 0.75
        right_leg_rot = -sin(t) * 0.75
        left_arm_rot = -sin(t) * 0.75
        right_arm_rot = sin(t) * 0.75
        head_rot = sin(t * 2) * 0.05
    elif current_anim == "wave":
        # Hand wave - Hand raise frontwards!
        right_arm_rot = 2.2  
        left_arm_rot = sin(frameCount * 0.05) * 0.15
        wave_angle = sin(frameCount * 0.2) * 0.3
        head_rot = 0.1
    else: # Idle breathing
        breathe = sin(frameCount * 0.04) * 0.05
        head_rot = breathe * 0.3
        right_arm_rot = breathe
        left_arm_rot = -breathe

    # Draw the Minecraft 3D character
    drawCharacter(head_rot, left_arm_rot, right_arm_rot, left_leg_rot, right_leg_rot, wave_angle)
    popMatrix() # Pop Player Matrix
    
    popMatrix() # Pop World Matrix
    
    # Draw 2D HUD text on top of the 3D scene
    drawHUD()

def drawGround():
    """Renders a nice Minecraft-themed ground grid below the character"""
    stroke(30, 58, 138, 100) # Dark blue neon outline
    strokeWeight(1.5)
    
    # Y-coordinate is set to 70 (just underneath the feet)
    ground_y = 70
    grid_range = 500
    grid_step = 50
    
    # Draw grid lines
    for i in range(-grid_range, grid_range + 1, grid_step):
        line(i, ground_y, -grid_range, i, ground_y, grid_range)
        line(-grid_range, ground_y, i, grid_range, ground_y, i)
        
    # Draw a simple decorative spawn platform
    noFill()
    stroke(59, 130, 246, 180) # Vibrant blue center outline
    rectMode(CENTER)
    pushMatrix()
    translate(0, ground_y, 0)
    rotateX(HALF_PI)
    rect(0, 0, 80, 80)
    popMatrix()

def updateMovement():
    """Handles smooth physics movement, rotation logic, and auto-anim switching"""
    global px, pz, player_angle, target_angle, current_anim, key_up, key_down, key_left, key_right
    
    dx = 0.0
    dz = 0.0
    
    # Check direction multipliers based on currently pressed keys
    if key_up:
        dz -= 1.0
    if key_down:
        dz += 1.0
    if key_left:
        dx -= 1.0
    if key_right:
        dx += 1.0
        
    # If there's any active movement input
    if dx != 0.0 or dz != 0.0:
        # Normalize diagonal speed
        length = sqrt(dx*dx + dz*dz)
        dx = (dx / length) * player_speed
        dz = (dz / length) * player_speed
        
        # Apply physics translation
        px += dx
        pz += dz
        
        # Calculate target facing angle using arc-tangent
        # We negate the angle to fit Processing's coordinate rotation system
        target_angle = atan2(dx, dz)
        
        # Automatically switch to running animation
        if current_anim != "wave":
            current_anim = "walk"
    else:
        # Stop moving, return to breathing idle animation
        if current_anim == "walk":
            current_anim = "idle"
            
    # Restrict movement area so player doesn't wander off the grid infinitely
    px = constrain(px, -450, 450)
    pz = constrain(pz, -450, 450)
    
    # Smooth rotational interpolation (Lerp) so 스티브 doesn't snap instantly
    angle_diff = target_angle - player_angle
    
    # Keep angle differences normalized within [-PI, PI] to avoid spinning 360 degrees the wrong way
    while angle_diff < -PI: angle_diff += TWO_PI
    while angle_diff > PI: angle_diff -= TWO_PI
    
    player_angle += angle_diff * 0.25 # Turning speed factor

def drawCharacter(head_rot, left_arm_rot, right_arm_rot, left_leg_rot, right_leg_rot, wave_angle):
    skin = skins[current_skin]
    
    # --- 1. TORSO (Center Anchor) ---
    pushMatrix()
    fill(skin["shirt"][0], skin["shirt"][1], skin["shirt"][2])
    stroke(30, 40, 50, 50)
    strokeWeight(1)
    box(40, 60, 20)
    popMatrix()
    
    # --- 2. HEAD (Pivot on Neck: Y = -30) ---
    pushMatrix()
    translate(0, -30, 0)
    rotateY(head_rot * 0.5)
    rotateX(head_rot)
    translate(0, -20, 0) # Half height translation
    
    # A. Skin Box base (40x40x40)
    fill(skin["skin"][0], skin["skin"][1], skin["skin"][2])
    stroke(30, 40, 50, 40)
    box(40, 40, 40)
    
    # B. Hair Cap
    # Top hair piece (Covers top of the head)
    pushMatrix()
    translate(0, -15, -2) # Shifted up & back to expose the face completely
    fill(skin["hair"][0], skin["hair"][1], skin["hair"][2])
    noStroke()
    box(42, 12, 38)
    popMatrix()
    
    # Back & Side hair piece
    pushMatrix()
    translate(0, 5, -8) 
    fill(skin["hair"][0], skin["hair"][1], skin["hair"][2])
    noStroke()
    box(42, 28, 26)
    popMatrix()
    
    # C. Eyes
    # Left Eye (White part)
    pushMatrix()
    translate(-10, -2, 20.5)
    fill(255)
    noStroke()
    box(8, 4, 2) 
    
    # Left Pupil
    translate(-1, 0, 0.5)
    fill(skin["eyes"][0], skin["eyes"][1], skin["eyes"][2])
    box(4, 4, 2)
    popMatrix()
    
    # Right Eye (White part)
    pushMatrix()
    translate(10, -2, 20.5)
    fill(255)
    noStroke()
    box(8, 4, 2)
    
    # Right Pupil
    translate(1, 0, 0.5)
    fill(skin["eyes"][0], skin["eyes"][1], skin["eyes"][2])
    box(4, 4, 2)
    popMatrix()
    
    # D. Mouth / Nose Bridge
    pushMatrix()
    translate(0, 8, 20.5)
    fill(skin["mouth"][0], skin["mouth"][1], skin["mouth"][2])
    noStroke()
    box(12, 6, 2)
    popMatrix()
    
    popMatrix() # Close Head

    # --- 3. RIGHT ARM (Shoulder Pivot: X = 28, Y = -22) ---
    pushMatrix()
    translate(28, -22, 0)
    rotateX(right_arm_rot)
    rotateZ(wave_angle)
    translate(0, 18, 0) # Draw downward from pivot
    
    # Sleeve
    fill(skin["shirt"][0], skin["shirt"][1], skin["shirt"][2])
    stroke(30, 40, 50, 45)
    box(skin["sleeveWidth"], 24, 16)
    
    # Skin hand portion
    pushMatrix()
    translate(0, 17, 0)
    fill(skin["skin"][0], skin["skin"][1], skin["skin"][2])
    box(skin["sleeveWidth"] - 0.2, 16, 15.8)
    popMatrix()
    popMatrix()

    # --- 4. LEFT ARM (Shoulder Pivot: X = -28, Y = -22) ---
    pushMatrix()
    translate(-28, -22, 0)
    rotateX(left_arm_rot)
    translate(0, 18, 0)
    
    # Sleeve
    fill(skin["shirt"][0], skin["shirt"][1], skin["shirt"][2])
    stroke(30, 40, 50, 45)
    box(skin["sleeveWidth"], 24, 16)
    
    # Skin hand portion
    pushMatrix()
    translate(0, 17, 0)
    fill(skin["skin"][0], skin["skin"][1], skin["skin"][2])
    box(skin["sleeveWidth"] - 0.2, 16, 15.8)
    popMatrix()
    popMatrix()

    # --- 5. RIGHT LEG (Hip Pivot: X = 10, Y = 30) ---
    pushMatrix()
    translate(10, 30, 0)
    rotateX(right_leg_rot)
    translate(0, 20, 0)
    
    # Pants
    fill(skin["pants"][0], skin["pants"][1], skin["pants"][2])
    stroke(30, 40, 50, 45)
    box(18, 28, 18)
    
    # Shoes
    pushMatrix()
    translate(0, 20, 0)
    fill(skin["shoes"][0], skin["shoes"][1], skin["shoes"][2])
    box(17.8, 14, 17.8)
    popMatrix()
    popMatrix()

    # --- 6. LEFT LEG (Hip Pivot: X = -10, Y = 30) ---
    pushMatrix()
    translate(-10, 30, 0)
    rotateX(left_leg_rot)
    translate(0, 20, 0)
    
    # Pants
    fill(skin["pants"][0], skin["pants"][1], skin["pants"][2])
    stroke(30, 40, 50, 45)
    box(18, 28, 18)
    
    # Shoes
    pushMatrix()
    translate(0, 20, 0)
    fill(skin["shoes"][0], skin["shoes"][1], skin["shoes"][2])
    box(17.8, 14, 17.8)
    popMatrix()
    popMatrix()

def drawHUD():
    # Disable 3D depth buffers temporarily to overlay clean 2D text
    hint(DISABLE_DEPTH_TEST)
    camera() # Reset camera matrix to 2D screen coordinate space
    
    # HUD Box
    fill(0, 0, 0, 180)
    noStroke()
    rect(15, 15, 340, 200, 10)
    
    fill(255)
    textSize(18)
    text("3D Character Runner Engine", 30, 45)
    
    textSize(11)
    fill(180, 200, 255)
    text("Preset: " + current_skin.upper() + "   |   Animation: " + current_anim.upper(), 30, 70)
    text("Coordinates: X=" + str(round(px, 1)) + " , Z=" + str(round(pz, 1)), 30, 85)
    
    fill(190)
    text("[1, 2, 3] Change Skin (Steve / Alex / Zombie)", 30, 115)
    text("[Q, E] Lock Animation (Q: Idle, E: Wave)", 30, 130)
    text("[Arrows / WASD] Move Steve (Auto Walking!)", 30, 150)
    text("[Mouse Drag] Rotate Camera | [Wheel] Zoom", 30, 170)
    text("[Space] Reset Camera Angle", 30, 190)
    
    # Re-enable 3D depth test for rendering the character model
    hint(ENABLE_DEPTH_TEST)

def mouseDragged():
    global cam_rot_x, cam_rot_y
    # Drag left/right controls Y-axis rotation, drag up/down controls X-axis rotation
    cam_rot_y += (mouseX - pmouseX) * 0.01
    cam_rot_x += (mouseY - pmouseY) * 0.01
    
    # Clamp vertical camera rotations to avoid flipping upside down
    cam_rot_x = constrain(cam_rot_x, -1.2, 0.2) # Do not look completely upside down

def mouseWheel(event):
    global cam_zoom
    e = event.getCount()
    # Zoom in/out based on mouse wheel movement
    cam_zoom -= e * 0.05
    cam_zoom = constrain(cam_zoom, 0.4, 2.5)

def keyPressed():
    global current_skin, current_anim, cam_rot_x, cam_rot_y, cam_zoom
    global key_up, key_down, key_left, key_right
    
    # Skin Switching Hotkeys
    if key == '1':
        current_skin = "steve"
    elif key == '2':
        current_skin = "alex"
    elif key == '3':
        current_skin = "zombie"
        
    # Manual Override Animation Hotkeys
    elif key == 'q' or key == 'Q':
        current_anim = "idle"
    elif key == 'e' or key == 'E':
        current_anim = "wave"
        
    # Reset View
    elif key == ' ':
        cam_rot_x = -0.4
        cam_rot_y = 0.5
        cam_zoom = 1.0
        
    # Active Movement Keys (Both WASD & ARROWS supported)
    if keyCode == UP or key == 'w' or key == 'W':
        key_up = True
    if keyCode == DOWN or key == 's' or key == 'S':
        key_down = True
    if keyCode == LEFT or key == 'a' or key == 'A':
        key_left = True
    if keyCode == RIGHT or key == 'd' or key == 'D':
        key_right = True

def keyReleased():
    global key_up, key_down, key_left, key_right
    
    # Stop moving on key release
    if keyCode == UP or key == 'w' or key == 'W':
        key_up = False
    if keyCode == DOWN or key == 's' or key == 'S':
        key_down = False
    if keyCode == LEFT or key == 'a' or key == 'A':
        key_left = False
    if keyCode == RIGHT or key == 'd' or key == 'D':
        key_right = False
