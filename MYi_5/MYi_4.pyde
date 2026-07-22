# Master Yi custom voxel colors (RGB)
YI_HELMET = [45, 55, 50]      # Dark metallic steel
YI_VISOR = [50, 255, 100]     # Bright neon green glowing lenses
YI_ROBE = [218, 165, 32]      # Golden mustard yellow robes
YI_BOOTS = [139, 69, 19]      # Leather brown boots
YI_BLADE = [190, 210, 230]    # Glowing silver steel
YI_HILT = [210, 160, 40]      # Golden crossguard/pommel
SKIN_PALE = [220, 200, 180]   # Light pale skin underneath hood

# Active state variables
current_anim = "idle"         # Animations: idle, walk, slash, meditate

# Combat & Skill States
slash_active = False
slash_timer = 0
slash_duration = 18           # Total frames for a sharp, fast strike (about 0.3s)

# Q - Alpha Strike State
alpha_active = False
alpha_timer = 0
alpha_duration = 60           # 1 second of untargetable alpha strike

# W - Meditate State
meditate_active = False

# E - Wuju Style State
wuju_active = False
wuju_timer = 0
wuju_duration = 300           # 5 seconds active duration

# R - Highlander State
highlander_active = False
highlander_timer = 0
highlander_duration = 420     # 7 seconds active duration
trail_history = []            # Position history to draw ghost afterimages

# Skill Cooldowns (in frames, 60 frames = 1 second)
q_cooldown_timer = 0
q_cooldown_max = 240      # Alpha Strike: 4s

w_cooldown_timer = 0
w_cooldown_max = 180      # Meditate: 3s (starts when you toggle it OFF)

e_cooldown_timer = 0
e_cooldown_max = 480      # Wuju Style: 8s

r_cooldown_timer = 0
r_cooldown_max = 1200     # Highlander: 20s

# Camera Controls
cam_rot_x = -0.5
cam_rot_y = 0.6
cam_zoom = 1.0

# Player Physics and Coordinates
px = 0.0
pz = 0.0
base_speed = 4.2
player_speed = base_speed
player_angle = 0.0
target_angle = 0.0

# Keyboard input tracking state (ARROW KEYS ONLY - WASD is reserved for skills)
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
    updateMovementAndSkills()

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

    # FIXED: +PI offset restored so the model's front (the visor, at local +Z)
    # actually faces the direction of travel instead of walking backwards.
    rotateY(player_angle)

    # Animation timeline evaluation
    t_walk = frameCount * (0.32 if highlander_active else 0.16) # Fast walk cycle in ultimate
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

    if alpha_active:
        # Yi is completely invisible during Alpha Strike
        pass
    elif meditate_active:
        # Meditative deep breathing stance (Arms centered, slight rhythmic swaying)
        breathe = sin(frameCount * 0.1) * 0.08
        head_rot = breathe * 0.5
        right_arm_rot = -1.3 + breathe
        left_arm_rot = -1.3 - breathe
        # Draw Master Yi in meditation stance
        drawMasterYi(head_rot, left_arm_rot, right_arm_rot, left_leg_rot, right_leg_rot, sword_yaw, left_arm_z, right_arm_z)
    elif slash_active:
        slash_timer += 1
        p = float(slash_timer) / slash_duration

        # End of single-slash cycle
        if slash_timer >= slash_duration:
            slash_active = False
            slash_timer = 0
            current_anim = "idle"

        # A disciplined single-strike arc (Extremely fast strike -> recovery)
        strike_factor = sin(p * PI)
        right_arm_rot = -1.6 + strike_factor * 2.4  # Sweeps down sharply
        left_arm_rot = -1.4 + strike_factor * 2.4   # Follows the sword hilt
        sword_yaw = strike_factor * 0.6

        # Grounded lunging leg stance during slash
        left_leg_rot = 0.4
        right_leg_rot = -0.4
        head_rot = 0.15
        drawMasterYi(head_rot, left_arm_rot, right_arm_rot, left_leg_rot, right_leg_rot, sword_yaw, left_arm_z, right_arm_z)

    elif current_anim == "walk":
        # Alternating standard run/walk cycle (Swaying while keeping hands aligned)
        left_leg_rot = sin(t_walk) * 0.8
        right_leg_rot = -sin(t_walk) * 0.8

        # Walk stance: Keep hands holding the sword forward, slight bobbing
        right_arm_rot = -1.0 + sin(t_walk * 2) * 0.1
        left_arm_rot = -0.8 + sin(t_walk * 2) * 0.1
        head_rot = sin(t_walk * 2) * 0.04
        drawMasterYi(head_rot, left_arm_rot, right_arm_rot, left_leg_rot, right_leg_rot, sword_yaw, left_arm_z, right_arm_z)
    else:
        # Idle deep breathing stance with solid two-handed grip
        breathe = sin(frameCount * 0.045) * 0.04
        head_rot = breathe * 0.4
        right_arm_rot = -1.1 + breathe
        left_arm_rot = -0.9 - breathe
        drawMasterYi(head_rot, left_arm_rot, right_arm_rot, left_leg_rot, right_leg_rot, sword_yaw, left_arm_z, right_arm_z)

    popMatrix() # Pop Player position matrix

    # Draw Skill Effects in World Space
    drawSkillEffects()

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

def updateMovementAndSkills():
    """Manages player acceleration, animations, and skill timers"""
    global px, pz, player_angle, target_angle, current_anim, key_up, key_down, key_left, key_right
    global player_speed, base_speed, slash_active, trail_history
    global alpha_active, alpha_timer, meditate_active, wuju_active, wuju_timer, highlander_active, highlander_timer
    global q_cooldown_timer, w_cooldown_timer, e_cooldown_timer, r_cooldown_timer

    # Cool down decrease
    if q_cooldown_timer > 0: q_cooldown_timer -= 1
    if w_cooldown_timer > 0: w_cooldown_timer -= 1
    if e_cooldown_timer > 0: e_cooldown_timer -= 1
    if r_cooldown_timer > 0: r_cooldown_timer -= 1

    # Update Skill Buff Timers
    if wuju_active:
        wuju_timer -= 1
        if wuju_timer <= 0:
            wuju_active = False

    if highlander_active:
        highlander_timer -= 1
        player_speed = 8.5 # Ultimate speed boost
        if highlander_timer <= 0:
            highlander_active = False
            player_speed = base_speed
    else:
        player_speed = base_speed

    # Handle Alpha Strike Active State
    if alpha_active:
        alpha_timer += 1
        if alpha_timer >= alpha_duration:
            alpha_active = False
            # Reappear slightly forward in facing direction
            px += sin(player_angle) * 70
            pz += cos(player_angle) * 70
            px = constrain(px, -450, 450)
            pz = constrain(pz, -450, 450)
            # Perform a slash instantly out of alpha strike
            slash_active = True
            slash_timer = 0
            current_anim = "slash"
        return # Block standard movement/updates during Alpha Strike

    dx = 0.0
    dz = 0.0

    if key_up:    dz -= 1.0
    if key_down:  dz += 1.0
    if key_left:  dx -= 1.0
    if key_right: dx += 1.0

    if dx != 0.0 or dz != 0.0:
        # Any movement cancels meditation
        if meditate_active:
            meditate_active = False
            current_anim = "idle"

        # Normalize diagonal translation speeds
        length = sqrt(dx*dx + dz*dz)
        dx = (dx / length) * player_speed
        dz = (dz / length) * player_speed

        px += dx
        pz += dz

        # Calculate angle of progression (facing direction matches travel direction)
        target_angle = atan2(-dx, -dz)

        if not slash_active and not meditate_active:
            current_anim = "walk"
    else:
        if current_anim == "walk" and not slash_active and not meditate_active:
            current_anim = "idle"

    # Constrain boundary of training zone
    px = constrain(px, -450, 450)
    pz = constrain(pz, -450, 450)

    # Record position for Highlander speed trail
    if highlander_active and frameCount % 3 == 0:
        trail_history.append((px, pz, player_angle))
        if len(trail_history) > 4:
            trail_history.pop(0)
    elif not highlander_active and len(trail_history) > 0:
        trail_history = [] # Reset trail

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

    # --- 2. HEAD & VISOR ---
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
    translate(0, 2, 2)
    fill(YI_ROBE[0], YI_ROBE[1], YI_ROBE[2])
    noStroke()
    box(42, 38, 38)
    popMatrix()

    # Visor array (The signature 7 glowing lenses on front face)
    stroke(15, 20, 15)
    strokeWeight(1)

    # Center lens
    pushMatrix()
    translate(0, -2, -20.5)
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
        translate(lx, ly, -0.2)
        box(6, 6, 2)
        popMatrix()

    popMatrix() # Pop visor
    popMatrix() # Pop Head matrix

    # --- 3. RIGHT ARM & SWORD (Pivot: X = 24, Y = -22) ---
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

    # Color depends on E (Wuju Style) Active
    if wuju_active:
        fill(0, 220, 255) # Glowing active neon cyan
        stroke(0, 150, 255, 200)
    else:
        fill(YI_BLADE[0], YI_BLADE[1], YI_BLADE[2])
        stroke(100, 150, 200, 100) # Subtle silver glow highlight

    box(6, 100, 14)

    # Sparks falling off blade when Wuju style is active
    if wuju_active and frameCount % 2 == 0:
        pushMatrix()
        translate(random(-5, 5), random(-50, 50), random(-5, 5))
        fill(0, 255, 255, 200)
        noStroke()
        box(3)
        popMatrix()

    popMatrix() # Close sword blade
    popMatrix() # Close sword hilt
    popMatrix() # Close glove
    popMatrix() # Close Right Arm

    # --- 4. LEFT ARM (Pivot: X = -24, Y = -22) ---
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

def drawSkillEffects():
    """Renders active visual effects such as Alpha Strike slashes and Meditate circular portals"""

    # 1. Q - Alpha Strike Slashes (Renders when active)
    if alpha_active:
        strokeWeight(3)
        for i in range(5):
            # Draw random high-speed golden slashing vectors in local region
            pushMatrix()
            translate(px + random(-60, 60), -30 + random(-40, 40), pz + random(-60, 60))
            rotateX(random(TWO_PI))
            rotateY(random(TWO_PI))
            stroke(255, 215, 0, 220) # Bright gold slashes
            line(-40, 0, 0, 40, 0, 0)
            popMatrix()

    # 2. W - Meditating concentric runic rings and green floating sparks
    if meditate_active:
        # Ground rings
        noFill()
        strokeWeight(2.5)
        for i in range(3):
            # Cycle radius out from center
            r = ((frameCount * 1.5 + i * 35) % 95)
            alpha_fade = map(r, 0, 95, 255, 10)
            stroke(34, 197, 94, alpha_fade) # Emerald-500 aura color
            pushMatrix()
            translate(px, 68, pz) # Floor level alignment
            rotateX(HALF_PI)
            ellipse(0, 0, r * 1.5, r * 1.5)
            popMatrix()

        # Floating healing sparks rising up
        noStroke()
        fill(74, 222, 128, 180) # Light green
        for i in range(8):
            pushMatrix()
            seed_x = sin(frameCount * 0.1 + i) * 25
            seed_z = cos(frameCount * 0.15 + i) * 25
            seed_y = 65 - ((frameCount + i * 15) % 100) * 0.8
            translate(px + seed_x, seed_y, pz + seed_z)
            box(random(3, 6))
            popMatrix()

    # 3. R - Highlander Ghost Afterimages
    if highlander_active and len(trail_history) > 0:
        for idx, pos in enumerate(trail_history):
            pushMatrix()
            translate(pos[0], 0, pos[1])
            rotateY(pos[2])

            # Draw semi-transparent speed wireframes
            noFill()
            stroke(52, 211, 153, map(idx, 0, len(trail_history), 15, 60)) # Emerald trail hue
            strokeWeight(1)
            box(38, 56, 18) # simplified torso wireframe
            popMatrix()

def drawHUD():
    """Overlays gameplay commands, cooldowns, and status metrics in 2D Space"""
    hint(DISABLE_DEPTH_TEST)
    camera() # Reset projection matrices to default 2D viewport

    # Render HUD panel plate
    fill(15, 23, 42, 220)
    stroke(16, 185, 129, 100)
    strokeWeight(1)
    rectMode(CORNER)
    rect(15, 15, 410, 225, 12)

    fill(255)
    textSize(18)
    text("3D Master Yi Combat Sandbox", 30, 45)

    textSize(11)
    fill(16, 185, 129)
    status_text = "ACTIVE"
    if alpha_active: status_text = "ALPHA STRIKE"
    elif meditate_active: status_text = "MEDITATING"
    text("Visor Array: " + status_text + "   |   Movement Speed: " + str(round(player_speed, 1)), 30, 70)

    fill(148, 163, 184)
    text("Coordinates: X=" + str(round(px, 1)) + " , Z=" + str(round(pz, 1)), 30, 85)

    # Combat Commands list
    fill(226, 232, 240)
    text("[Left Click] Basic Single Slash (Controlled Strike)", 30, 115)
    text("[Q] Alpha Strike (1s Untargetable Blink Attack)", 30, 130)
    text("[W] Meditate (Stationary Self-Heal Aura)", 30, 145)

    # E Status
    if wuju_active:
        fill(56, 189, 248) # Active blue
        text("[E] Wuju Style - ACTIVE (" + str(round(wuju_timer / 60.0, 1)) + "s left)", 30, 160)
    else:
        fill(226, 232, 240)
        text("[E] Wuju Style (Activate Neon Cyan Sword)", 30, 160)

    # R Status
    if highlander_active:
        fill(248, 113, 113) # Active red speed
        text("[R] Highlander - SPEED BOOST ACTIVE (" + str(round(highlander_timer / 60.0, 1)) + "s left)", 30, 175)
    else:
        fill(226, 232, 240)
        text("[R] Highlander (Activate Speed Ghost Trails)", 30, 175)

    fill(148, 163, 184)
    text("[Arrow Keys] Move Yi  |  [Mouse Drag] Rotate Camera", 30, 200)
    text("[Space] Snap Camera", 30, 215)

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

def mousePressed():
    """Trigger basic attack Single Slash via mouse click"""
    global slash_active, slash_timer, current_anim, meditate_active
    if mouseButton == LEFT:
        if not slash_active and not alpha_active:
            if meditate_active:
                meditate_active = False # Cancel meditation when attacking
            slash_active = True
            slash_timer = 0
            current_anim = "slash"

def keyPressed():
    global current_anim, cam_rot_x, cam_rot_y, cam_zoom
    global key_up, key_down, key_left, key_right
    global slash_active, slash_timer, meditate_active, alpha_active, alpha_timer
    global wuju_active, wuju_timer, wuju_duration, highlander_active, highlander_timer, highlander_duration

    # Skill Bind Q - Alpha Strike
    if key == 'q' or key == 'Q':
        if not alpha_active and not slash_active:
            alpha_active = True
            alpha_timer = 0
            meditate_active = False
            current_anim = "slash"

    # Skill Bind W - Meditate
    elif key == 'w' or key == 'W':
        if not alpha_active and not slash_active:
            meditate_active = not meditate_active # Toggle meditation state
            current_anim = "meditate" if meditate_active else "idle"

    # Skill Bind E - Wuju Style
    elif key == 'e' or key == 'E':
        if not alpha_active:
            wuju_active = True
            wuju_timer = wuju_duration

    # Skill Bind R - Highlander (Ultimate)
    elif key == 'r' or key == 'R':
        if not alpha_active:
            highlander_active = True
            highlander_timer = highlander_duration

    # Snap view angle / alternative slash trigger
    elif key == ' ':
        if not slash_active and not alpha_active:
            if meditate_active:
                meditate_active = False
            slash_active = True
            slash_timer = 0
            current_anim = "slash"

    # Movement binds - ARROW KEYS ONLY (WASD is fully reserved for skills above)
    if keyCode == UP:
        key_up = True
    if keyCode == DOWN:
        key_down = True
    if keyCode == LEFT:
        key_left = True
    if keyCode == RIGHT:
        key_right = True

def keyReleased():
    global key_up, key_down, key_left, key_right

    if keyCode == UP:
        key_up = False
    if keyCode == DOWN:
        key_down = False
    if keyCode == LEFT:
        key_left = False
    if keyCode == RIGHT:
        key_right = False
