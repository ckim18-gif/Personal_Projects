# Desktop Processing (Python Mode) - Master Yi 3D Controller
from java.lang import System
System.setProperty("apple.awt.UIElement", "true")

# Master Yi custom voxel colors (RGB)
YI_HELMET = [45, 55, 50]      # Dark metallic steel
YI_VISOR = [50, 255, 100]     # Bright neon green glowing lenses
YI_ROBE = [218, 165, 32]      # Golden mustard yellow robes
YI_BOOTS = [139, 69, 19]      # Leather brown boots
YI_BLADE = [190, 210, 230]    # Glowing silver steel
YI_HILT = [210, 160, 40]      # Golden crossguard/pommel
SKIN_PALE = [220, 200, 180]   # Light pale skin underneath hood

# Active state variables
current_anim = "idle"         # Animations: idle, walk, slash

# Sharp single-slash state variables
slash_active = False
slash_timer = 0
slash_duration = 20           # Total frames for a sharp, fast strike (about 0.33s at 60fps)

# Camera Controls
cam_rot_x = -0.5
cam_rot_y = 0.6
cam_zoom = 1.0

# Player Physics and Coordinates
px = 0.0
pz = 0.0
player_speed = 4.2
player_angle = 0.0
target_angle = 0.0

# Keyboard input tracking state
key_up = False
key_down = False
key_left = False
key_right = False

def setup():
    size(700, 700, P3D)
    frameRate(60)

def draw():
    background(15, 23, 42) # Cool space-slate dark background
    
    # Process inputs and update movement coordinates
    updateMovement()
    
    # 3D Lights environment
    ambientLight(100, 110, 130)
    directionalLight(255, 255, 240, 0.4, 1.0, -0.2) # Soft sunlight
    directionalLight(80, 200, 120, -0.6, -0.3, 0.5) # Glowing green environment fill light

    # Apply Global Camera view matrices
    pushMatrix()
    translate(width / 2, height / 2 + 30, 50)
    scale(cam_zoom * 2.3)
    rotateX(cam_rot_x)
    rotateY(cam_rot_y)
    
    # Render the training ground arena grid
    drawGround()

    # Move and orient Master Yi model
    pushMatrix()
    translate(px, 0, pz)
    rotateY(player_angle + PI) # FIXED: Flipped 180 degrees so his face aligns perfectly with movement direction

    # Animation timeline evaluation
    t_walk = frameCount * 0.16
    global slash_active, slash_timer, current_anim
    
    head_rot = 0
    left_arm_rot = 0
    right_arm_rot = 0
    left_leg_rot = 0
    right_leg_rot = 0
    sword_yaw = 0 
    
    # Inward angles to force both hands to meet at the hilt (Two-handed grip)
    left_arm_z = -0.65             # Tilt left arm inwards towards center
    right_arm_z = 0.25           # Tilt right arm inwards towards center

    if slash_active:
        slash_timer += 1
        p = float(slash_timer) / slash_duration
        
        # End of single-slash cycle
        if slash_timer >= slash_duration:
            slash_active = False
            slash_timer = 0
            current_anim = "idle"
            
        # A disciplined single-strike arc (Wind up -> Extremely fast strike -> Cool down)
        # Using a weighted sine-wave for punchy momentum
        strike_factor = sin(p * PI)
        right_arm_rot = -1.6 + strike_factor * 2.2  # Sweeps down sharply
        left_arm_rot = -1.4 + strike_factor * 2.2   # Follows the sword hilt
        sword_yaw = strike_factor * 0.6
        
        # Grounded lunging leg stance during slash
        left_leg_rot = 0.4
        right_leg_rot = -0.4
        head_rot = 0.15
        
    elif current_anim == "walk":
        # Alternating standard run/walk cycle (Swaying while keeping hands aligned)
        left_leg_rot = sin(t_walk) * 0.8
        right_leg_rot = -sin(t_walk) * 0.8
        
        # Walk stance: Keep hands holding the sword forward, slight bobbing
        right_arm_rot = -1.0 + sin(t_walk * 2) * 0.1
        left_arm_rot = -0.8 + sin(t_walk * 2) * 0.1
        head_rot = sin(t_walk * 2) * 0.04
    else:
        # Idle deep breathing stance with solid two-handed grip
        breathe = sin(frameCount * 0.045) * 0.04
        head_rot = breathe * 0.4
        right_arm_rot = -1.1 + breathe
        left_arm_rot = -0.9 - breathe

    # Draw Master Yi 3D voxel assembly with two-handed orientation adjustments
    drawMasterYi(head_rot, left_arm_rot, right_arm_rot, left_leg_rot, right_leg_rot, sword_yaw, left_arm_z, right_arm_z)
    popMatrix() # Pop Player position matrix
    
    popMatrix() # Pop World camera matrix
    
    # Overlay UI/HUD controls cleanly
    drawHUD()

def drawGround():
    """Renders a digital combat arena grid under Master Yi's feet"""
    stroke(16, 185, 129, 60) # Neon green wireframes
    strokeWeight(1.2)
    
    ground_y = 70
    grid_range = 500
    grid_step = 50
    
    for i in range(-grid_range, grid_range + 1, grid_step):
        line(i, ground_y, -grid_range, i, ground_y, grid_range)
        line(-grid_range, ground_y, i, grid_range, ground_y, i)
        
    # Render Center Shrine Platform
    noFill()
    stroke(16, 185, 129, 180)
    rectMode(CENTER)
    pushMatrix()
    translate(0, ground_y, 0)
    rotateX(HALF_PI)
    rect(0, 0, 100, 100, 10)
    popMatrix()

def updateMovement():
    """Manages player acceleration, direction calculation, and animations"""
    global px, pz, player_angle, target_angle, current_anim, key_up, key_down, key_left, key_right, slash_active
    
    dx = 0.0
    dz = 0.0
    
    if key_up:    dz -= 1.0
    if key_down:  dz += 1.0
    if key_left:  dx -= 1.0
    if key_right: dx += 1.0
        
    if dx != 0.0 or dz != 0.0:
        # Normalize diagonal translation speeds
        length = sqrt(dx*dx + dz*dz)
        dx = (dx / length) * player_speed
        dz = (dz / length) * player_speed
        
        px += dx
        pz += dz
        
        # Calculate angle of progression
        target_angle = atan2(dx, dz)
        
        if not slash_active:
            current_anim = "walk"
    else:
        if current_anim == "walk" and not slash_active:
            current_anim = "idle"
            
    # Constrain boundary of training zone
    px = constrain(px, -450, 450)
    pz = constrain(pz, -450, 450)
    
    # Smooth rotational transition loop (avoiding snap rotations)
    angle_diff = target_angle - player_angle
    while angle_diff < -PI: angle_diff += TWO_PI
    while angle_diff > PI: angle_diff -= TWO_PI
    
    player_angle += angle_diff * 0.25

def drawMasterYi(head_rot, left_arm_rot, right_arm_rot, left_leg_rot, right_leg_rot, sword_yaw, left_arm_z, right_arm_z):
    """Draws Master Yi with a glowing green 7-lens visor helmet and steel sword"""
    
    # --- 1. TORSO (Yellow/Green Robes and Breastplate) ---
    pushMatrix()
    fill(YI_ROBE[0], YI_ROBE[1], YI_ROBE[2])
    stroke(25, 35, 30)
    strokeWeight(1)
    box(42, 60, 22) # Main body tunic
    
    # Shoulder guard pauldrons (Slightly larger layered boxes)
    pushMatrix()
    translate(0, -15, 0)
    fill(YI_HELMET[0], YI_HELMET[1], YI_HELMET[2])
    box(48, 12, 26)
    popMatrix()
    popMatrix()
    
    # --- 2. HEAD & VISOR (Rotates relative to neck pivot: Y = -30) ---
    pushMatrix()
    translate(0, -30, 0)
    rotateY(head_rot * 0.5)
    rotateX(head_rot)
    translate(0, -20, 0) # Raise up half of head size
    
    # Helmet foundation box (40x40x40)
    fill(YI_HELMET[0], YI_HELMET[1], YI_HELMET[2])
    box(40, 40, 40)
    
    # Hood wrapper surrounding back and top
    pushMatrix()
    translate(0, 2, -2)
    fill(YI_ROBE[0], YI_ROBE[1], YI_ROBE[2])
    noStroke()
    box(42, 38, 38)
    popMatrix()
    
    # Visor array (The signature 7 glowing lenses on front face)
    stroke(15, 20, 15)
    strokeWeight(1)
    
    # Center lens
    pushMatrix()
    translate(0, -2, 20.5)
    fill(YI_VISOR[0], YI_VISOR[1], YI_VISOR[2])
    box(8, 8, 2)
    
    # 6 surrounding lens rings (A circular hexagonal pattern)
    lenses = [
        (-10, -10), (10, -10),   # Top row
        (-12, 1),   (12, 1),     # Middle row
        (-10, 12),  (10, 12)     # Bottom row
    ]
    for lx, ly in lenses:
        pushMatrix()
        translate(lx, ly, 0.2)
        box(6, 6, 2)
        popMatrix()
        
    popMatrix() # Pop visor
    popMatrix() # Pop Head matrix

    # --- 3. RIGHT ARM & SWORD (Pivot: X = 29, Y = -22) ---
    pushMatrix()
    translate(24, -22, 0)         # Shifted slightly closer to torso center
    rotateX(right_arm_rot)
    rotateZ(right_arm_z)          # Tilted inwards towards hilt center
    translate(0, 18, 0)
    
    # Robe sleeve
    fill(YI_ROBE[0], YI_ROBE[1], YI_ROBE[2])
    stroke(25, 35, 30)
    box(14, 24, 14)
    
    # Glove/Hand portion
    pushMatrix()
    translate(0, 17, 0)
    fill(YI_HELMET[0], YI_HELMET[1], YI_HELMET[2]) # Dark gauntlet color
    box(13.8, 16, 13.8)
    
    # --- MASTER YI'S SWORD ATTACHMENT ---
    # Extending straight forward/downward from the grip of his fist
    pushMatrix()
    translate(0, 6, 0)
    rotateX(HALF_PI + 0.3) # Angle the sword out of his hand
    rotateZ(sword_yaw)
    
    # Guard / Crossguard
    fill(YI_HILT[0], YI_HILT[1], YI_HILT[2])
    box(24, 6, 12)
    
    # Guard ring details (Simple voxel accent)
    pushMatrix()
    translate(0, -6, 0)
    box(10, 6, 16)
    popMatrix()
    
    # Double-edged long sword blade
    pushMatrix()
    translate(0, -50, 0) # translate up along length
    fill(YI_BLADE[0], YI_BLADE[1], YI_BLADE[2])
    stroke(100, 150, 200, 100) # Subtle glow highlight
    box(6, 100, 14)
    popMatrix()
    
    popMatrix() # Close sword
    popMatrix() # Close glove
    popMatrix() # Close Right Arm

    # --- 4. LEFT ARM (Pivot: X = -29, Y = -22) ---
    pushMatrix()
    translate(-24, -22, 0)        # Shifted slightly closer to torso center
    rotateX(left_arm_rot)
    rotateZ(left_arm_z)           # Tilted inwards to meet right hand at hilt
    translate(0, 18, 0)
    
    fill(YI_ROBE[0], YI_ROBE[1], YI_ROBE[2])
    stroke(25, 35, 30)
    box(14, 24, 14)
    
    # Left hand gauntlet
    pushMatrix()
    translate(0, 17, 0)
    fill(YI_HELMET[0], YI_HELMET[1], YI_HELMET[2])
    box(13.8, 16, 13.8)
    popMatrix()
    popMatrix()

    # --- 5. RIGHT LEG (Pivot: X = 11, Y = 30) ---
    pushMatrix()
    translate(11, 30, 0)
    rotateX(right_leg_rot)
    translate(0, 20, 0)
    
    # Robe leggings
    fill(YI_ROBE[0], YI_ROBE[1], YI_ROBE[2])
    stroke(25, 35, 30)
    box(18, 28, 18)
    
    # Brown boot
    pushMatrix()
    translate(0, 20, 0)
    fill(YI_BOOTS[0], YI_BOOTS[1], YI_BOOTS[2])
    box(17.8, 14, 17.8)
    popMatrix()
    popMatrix()

    # --- 6. LEFT LEG (Pivot: X = -11, Y = 30) ---
    pushMatrix()
    translate(-11, 30, 0)
    rotateX(left_leg_rot)
    translate(0, 20, 0)
    
    # Robe leggings
    fill(YI_ROBE[0], YI_ROBE[1], YI_ROBE[2])
    stroke(25, 35, 30)
    box(18, 28, 18)
    
    # Brown boot
    pushMatrix()
    translate(0, 20, 0)
    fill(YI_BOOTS[0], YI_BOOTS[1], YI_BOOTS[2])
    box(17.8, 14, 17.8)
    popMatrix()
    popMatrix()

def drawHUD():
    """Overlays gameplay commands and diagnostics in 2D Space"""
    hint(DISABLE_DEPTH_TEST)
    camera() # Reset projection matrices to default 2D viewport
    
    # Render HUD panel plate
    fill(15, 23, 42, 220)
    stroke(16, 185, 129, 100)
    strokeWeight(1)
    rectMode(CORNER)
    rect(15, 15, 360, 200, 12)
    
    fill(255)
    textSize(18)
    text("3D Master Yi Alpha Engine", 30, 45)
    
    textSize(11)
    fill(16, 185, 129)
    text("Visor Array: ACTIVE   |   Animation: " + current_anim.upper(), 30, 70)
    fill(148, 163, 184)
    text("Coordinates: X=" + str(round(px, 1)) + " , Z=" + str(round(pz, 1)), 30, 85)
    
    fill(226, 232, 240)
    text("[Q] Meditative Idle | [E] Sharp Single Slash", 30, 115)
    text("[Arrows / WASD] Move Master Yi (Auto Run)", 30, 135)
    text("[Mouse Drag] Orbit Camera | [Wheel] Zoom", 30, 155)
    text("[Space] Reset Camera Angle & Distance", 30, 175)
    
    hint(ENABLE_DEPTH_TEST)

def mouseDragged():
    global cam_rot_x, cam_rot_y
    cam_rot_y += (mouseX - pmouseX) * 0.01
    cam_rot_x += (mouseY - pmouseY) * 0.01
    
    # Block cameras from flipping completely upside-down
    cam_rot_x = constrain(cam_rot_x, -1.3, 0.1)

def mouseWheel(event):
    global cam_zoom
    e = event.getCount()
    cam_zoom -= e * 0.05
    cam_zoom = constrain(cam_zoom, 0.4, 2.5)

def keyPressed():
    global current_anim, cam_rot_x, cam_rot_y, cam_zoom
    global key_up, key_down, key_left, key_right
    global slash_active, slash_timer
    
    # Custom state overrides
    if key == 'q' or key == 'Q':
        current_anim = "idle"
        slash_active = False
    elif key == 'e' or key == 'E':
        # Trigger single controlled slash
        if not slash_active:
            slash_active = True
            slash_timer = 0
            current_anim = "slash"
        
    # Snap view angle
    elif key == ' ':
        cam_rot_x = -0.5
        cam_rot_y = 0.6
        cam_zoom = 1.0
        
    # Movement binds
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
    
    if keyCode == UP or key == 'w' or key == 'W':
        key_up = False
    if keyCode == DOWN or key == 's' or key == 'S':
        key_down = False
    if keyCode == LEFT or key == 'a' or key == 'A':
        key_left = False
    if keyCode == RIGHT or key == 'd' or key == 'D':
        key_right = False
