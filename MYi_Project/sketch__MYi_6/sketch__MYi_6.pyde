# Desktop Processing (Python Mode) - Master Yi 3D Controller with Full QWER Skill Set
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

# --- Skill Cooldowns (in frames, 60 frames = 1 second) ---
q_cooldown_timer = 0
q_cooldown_max = 240          # Alpha Strike: 4s

w_cooldown_timer = 0
w_cooldown_max = 180          # Meditate: 3s (starts when toggled OFF)

e_cooldown_timer = 0
e_cooldown_max = 480          # Wuju Style: 8s

r_cooldown_timer = 0
r_cooldown_max = 1200         # Highlander: 20s

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

# Practice Dummy - fixed position in the arena
DUMMY_X = 260
DUMMY_Z = -220

def setup():
    size(700, 700, P3D)
    frameRate(60)

def draw():
    background(15, 23, 42) # Cool space-slate dark background

    # Process inputs, cooldowns, and update movement coordinates
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

    # Render the stationary practice dummy
    drawDummy()

    # Move and orient Master Yi model
    pushMatrix()
    translate(px, 0, pz)
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
    left_arm_z = -0.65            # Tilt left arm inwards towards center
    right_arm_z = 0.25            # Tilt right arm inwards towards center

    if alpha_active:
        # Yi is completely invisible during Alpha Strike
        pass
    elif meditate_active:
        breathe = sin(frameCount * 0.1) * 0.08
        head_rot = breathe * 0.5
        right_arm_rot = -1.3 + breathe
        left_arm_rot = -1.3 - breathe
        drawMasterYi(head_rot, left_arm_rot, right_arm_rot, left_leg_rot, right_leg_rot, sword_yaw, left_arm_z, right_arm_z)
    elif slash_active:
        slash_timer += 1
        p = float(slash_timer) / slash_duration

        if slash_timer >= slash_duration:
            slash_active = False
            slash_timer = 0
            current_anim = "idle"

        strike_factor = sin(p * PI)
        right_arm_rot = -1.6 + strike_factor * 2.4
        left_arm_rot = -1.4 + strike_factor * 2.4
        sword_yaw = strike_factor * 0.6

        left_leg_rot = 0.4
        right_leg_rot = -0.4
        head_rot = 0.15
        drawMasterYi(head_rot, left_arm_rot, right_arm_rot, left_leg_rot, right_leg_rot, sword_yaw, left_arm_z, right_arm_z)

    elif current_anim == "walk":
        left_leg_rot = sin(t_walk) * 0.8
        right_leg_rot = -sin(t_walk) * 0.8

        right_arm_rot = -1.0 + sin(t_walk * 2) * 0.1
        left_arm_rot = -0.8 + sin(t_walk * 2) * 0.1
        head_rot = sin(t_walk * 2) * 0.04
        drawMasterYi(head_rot, left_arm_rot, right_arm_rot, left_leg_rot, right_leg_rot, sword_yaw, left_arm_z, right_arm_z)
    else:
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
    drawSkillBar()

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

    noFill()
    stroke(16, 185, 129, 180)
    rectMode(CENTER)
    pushMatrix()
    translate(0, ground_y, 0)
    rotateX(HALF_PI)
    rect(0, 0, 100, 100, 10)
    popMatrix()

def drawDummy():
    """Renders a stationary red/white striped practice dummy with a target ring on the ground"""
    ground_y = 70

    # Ground target ring (bullseye) under the dummy
    noFill()
    strokeWeight(2)
    pushMatrix()
    translate(DUMMY_X, ground_y - 0.5, DUMMY_Z)
    rotateX(HALF_PI)
    stroke(239, 68, 68, 200)
    ellipse(0, 0, 90, 90)
    stroke(239, 68, 68, 120)
    ellipse(0, 0, 55, 55)
    popMatrix()

    # Dummy body - stacked striped post
    pushMatrix()
    translate(DUMMY_X, 0, DUMMY_Z)
    strokeWeight(1)
    stroke(40, 30, 20)

    stripe_h = 20
    stripe_count = 5
    for i in range(stripe_count):
        pushMatrix()
        translate(0, 40 - i * stripe_h, 0)
        if i % 2 == 0:
            fill(210, 40, 40)   # Red stripe
        else:
            fill(235, 230, 220) # White stripe
        box(26, stripe_h, 26)
        popMatrix()

    # Wooden crossbar "arms"
    pushMatrix()
    translate(0, -25, 0)
    fill(120, 80, 45)
    box(70, 8, 8)
    popMatrix()

    # Straw head
    pushMatrix()
    translate(0, -55, 0)
    fill(200, 175, 110)
    box(24, 24, 24)
    popMatrix()

    # Wooden base stand
    pushMatrix()
    translate(0, 52, 0)
    fill(90, 60, 35)
    box(34, 10, 34)
    popMatrix()
    popMatrix()

def updateMovementAndSkills():
    """Manages player acceleration, animations, and skill timers"""
    global px, pz, player_angle, target_angle, current_anim, key_up, key_down, key_left, key_right
    global player_speed, base_speed, slash_active, trail_history
    global alpha_active, alpha_timer, meditate_active, wuju_active, wuju_timer, highlander_active, highlander_timer
    global q_cooldown_timer, w_cooldown_timer, e_cooldown_timer, r_cooldown_timer

    # --- Cooldown countdowns tick down every frame ---
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
            px += sin(player_angle) * 70
            pz += cos(player_angle) * 70
            px = constrain(px, -450, 450)
            pz = constrain(pz, -450, 450)
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
        if meditate_active:
            meditate_active = False
            current_anim = "idle"

        length = sqrt(dx*dx + dz*dz)
        dx = (dx / length) * player_speed
        dz = (dz / length) * player_speed

        px += dx
        pz += dz

        target_angle = atan2(-dx, -dz)

        if not slash_active and not meditate_active:
            current_anim = "walk"
    else:
        if current_anim == "walk" and not slash_active and not meditate_active:
            current_anim = "idle"

    px = constrain(px, -450, 450)
    pz = constrain(pz, -450, 450)

    if highlander_active and frameCount % 3 == 0:
        trail_history.append((px, pz, player_angle))
        if len(trail_history) > 4:
            trail_history.pop(0)
    elif not highlander_active and len(trail_history) > 0:
        trail_history = []

    angle_diff = target_angle - player_angle
    while angle_diff < -PI: angle_diff += TWO_PI
    while angle_diff > PI: angle_diff -= TWO_PI

    player_angle += angle_diff * 0.25

def drawMasterYi(head_rot, left_arm_rot, right_arm_rot, left_leg_rot, right_leg_rot, sword_yaw, left_arm_z, right_arm_z):
    """Draws Master Yi with a glowing green 7-lens visor helmet and steel sword"""

    # --- 1. TORSO ---
    pushMatrix()
    fill(YI_ROBE[0], YI_ROBE[1], YI_ROBE[2])
    stroke(25, 35, 30)
    strokeWeight(1)
    box(42, 60, 22)

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
    translate(0, -20, 0)

    fill(YI_HELMET[0], YI_HELMET[1], YI_HELMET[2])
    box(40, 40, 40)

    # Hood wrapper (back of head)
    pushMatrix()
    translate(0, 2, 2)
    fill(YI_ROBE[0], YI_ROBE[1], YI_ROBE[2])
    noStroke()
    box(42, 38, 38)
    popMatrix()

    # Visor array (front of head, faces travel direction)
    stroke(15, 20, 15)
    strokeWeight(1)

    pushMatrix()
    translate(0, -2, -20.5)
    fill(YI_VISOR[0], YI_VISOR[1], YI_VISOR[2])
    box(8, 8, 2)

    lenses = [
        (-10, -10), (10, -10),
        (-12, 1),   (12, 1),
        (-10, 12),  (10, 12)
    ]
    for lx, ly in lenses:
        pushMatrix()
        translate(lx, ly, -0.2)
        box(6, 6, 2)
        popMatrix()

    popMatrix()
    popMatrix()

    # --- 3. RIGHT ARM & SWORD ---
    pushMatrix()
    translate(24, -22, 0)
    rotateX(right_arm_rot)
    rotateZ(right_arm_z)
    translate(0, 18, 0)

    fill(YI_ROBE[0], YI_ROBE[1], YI_ROBE[2])
    stroke(25, 35, 30)
    box(14, 24, 14)

    pushMatrix()
    translate(0, 17, 0)
    fill(YI_HELMET[0], YI_HELMET[1], YI_HELMET[2])
    box(13.8, 16, 13.8)

    pushMatrix()
    translate(0, 6, 0)
    rotateX(HALF_PI + 0.3)
    rotateZ(sword_yaw)

    fill(YI_HILT[0], YI_HILT[1], YI_HILT[2])
    box(24, 6, 12)

    pushMatrix()
    translate(0, -6, 0)
    box(10, 6, 16)
    popMatrix()

    pushMatrix()
    translate(0, -50, 0)

    if wuju_active:
        fill(0, 220, 255)
        stroke(0, 150, 255, 200)
    else:
        fill(YI_BLADE[0], YI_BLADE[1], YI_BLADE[2])
        stroke(100, 150, 200, 100)

    box(6, 100, 14)

    if wuju_active and frameCount % 2 == 0:
        pushMatrix()
        translate(random(-5, 5), random(-50, 50), random(-5, 5))
        fill(0, 255, 255, 200)
        noStroke()
        box(3)
        popMatrix()

    popMatrix()
    popMatrix()
    popMatrix()
    popMatrix()

    # --- 4. LEFT ARM ---
    pushMatrix()
    translate(-24, -22, 0)
    rotateX(left_arm_rot)
    rotateZ(left_arm_z)
    translate(0, 18, 0)

    fill(YI_ROBE[0], YI_ROBE[1], YI_ROBE[2])
    stroke(25, 35, 30)
    box(14, 24, 14)

    pushMatrix()
    translate(0, 17, 0)
    fill(YI_HELMET[0], YI_HELMET[1], YI_HELMET[2])
    box(13.8, 16, 13.8)
    popMatrix()
    popMatrix()

    # --- 5. RIGHT LEG ---
    pushMatrix()
    translate(11, 30, 0)
    rotateX(right_leg_rot)
    translate(0, 20, 0)

    fill(YI_ROBE[0], YI_ROBE[1], YI_ROBE[2])
    stroke(25, 35, 30)
    box(18, 28, 18)

    pushMatrix()
    translate(0, 20, 0)
    fill(YI_BOOTS[0], YI_BOOTS[1], YI_BOOTS[2])
    box(17.8, 14, 17.8)
    popMatrix()
    popMatrix()

    # --- 6. LEFT LEG ---
    pushMatrix()
    translate(-11, 30, 0)
    rotateX(left_leg_rot)
    translate(0, 20, 0)

    fill(YI_ROBE[0], YI_ROBE[1], YI_ROBE[2])
    stroke(25, 35, 30)
    box(18, 28, 18)

    pushMatrix()
    translate(0, 20, 0)
    fill(YI_BOOTS[0], YI_BOOTS[1], YI_BOOTS[2])
    box(17.8, 14, 17.8)
    popMatrix()
    popMatrix()

def drawSkillEffects():
    """Renders active visual effects such as Alpha Strike slashes and Meditate circular portals"""

    if alpha_active:
        strokeWeight(3)
        for i in range(5):
            pushMatrix()
            translate(px + random(-60, 60), -30 + random(-40, 40), pz + random(-60, 60))
            rotateX(random(TWO_PI))
            rotateY(random(TWO_PI))
            stroke(255, 215, 0, 220)
            line(-40, 0, 0, 40, 0, 0)
            popMatrix()

    if meditate_active:
        noFill()
        strokeWeight(2.5)
        for i in range(3):
            r = ((frameCount * 1.5 + i * 35) % 95)
            alpha_fade = map(r, 0, 95, 255, 10)
            stroke(34, 197, 94, alpha_fade)
            pushMatrix()
            translate(px, 68, pz)
            rotateX(HALF_PI)
            ellipse(0, 0, r * 1.5, r * 1.5)
            popMatrix()

        noStroke()
        fill(74, 222, 128, 180)
        for i in range(8):
            pushMatrix()
            seed_x = sin(frameCount * 0.1 + i) * 25
            seed_z = cos(frameCount * 0.15 + i) * 25
            seed_y = 65 - ((frameCount + i * 15) % 100) * 0.8
            translate(px + seed_x, seed_y, pz + seed_z)
            box(random(3, 6))
            popMatrix()

    if highlander_active and len(trail_history) > 0:
        for idx, pos in enumerate(trail_history):
            pushMatrix()
            translate(pos[0], 0, pos[1])
            rotateY(pos[2])

            noFill()
            stroke(52, 211, 153, map(idx, 0, len(trail_history), 15, 60))
            strokeWeight(1)
            box(38, 56, 18)
            popMatrix()

def drawHUD():
    """Overlays gameplay status text in 2D Space"""
    hint(DISABLE_DEPTH_TEST)
    camera()

    fill(15, 23, 42, 220)
    stroke(16, 185, 129, 100)
    strokeWeight(1)
    rectMode(CORNER)
    rect(15, 15, 410, 130, 12)

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
    text("Coordinates: X=" + str(round(px, 1)) + " , Z=" + str(round(pz, 1)), 30, 90)
    text("[Arrow Keys] Move  |  [Mouse Drag] Rotate Camera  |  [Click/Space] Slash", 30, 110)
    text("Practice dummy is out at X=" + str(DUMMY_X) + ", Z=" + str(DUMMY_Z), 30, 128)

    hint(ENABLE_DEPTH_TEST)

def drawSkillIcon(x, y, size, key_label, base_color, is_active, active_seconds_left, cooldown_timer, cooldown_max):
    """Draws a single LoL-style skill icon box with cooldown/active overlays"""
    rectMode(CORNER)

    ready = (cooldown_timer <= 0)

    if is_active:
        fill(base_color[0], base_color[1], base_color[2], 255)
    elif ready:
        fill(base_color[0] * 0.55, base_color[1] * 0.55, base_color[2] * 0.55)
    else:
        fill(35, 35, 40)

    if is_active:
        stroke(255, 255, 255)
        strokeWeight(3)
    else:
        stroke(16, 185, 129, 150)
        strokeWeight(1.5)

    rect(x, y, size, size, 8)

    # Cooldown dark sweep + big countdown number
    if not ready and not is_active:
        noStroke()
        fill(0, 0, 0, 165)
        rect(x, y, size, size, 8)

        fill(255)
        textAlign(CENTER, CENTER)
        textSize(20)
        text(str(ceil(cooldown_timer / 60.0)), x + size / 2, y + size / 2 - 4)

    # Key letter label (top-left corner)
    fill(255)
    textAlign(LEFT, TOP)
    textSize(13)
    text(key_label, x + 5, y + 3)

    # Active duration countdown / status (small text under the icon)
    textAlign(CENTER, TOP)
    textSize(10)
    if is_active:
        fill(255, 255, 255)
        text(str(round(active_seconds_left, 1)) + "s", x + size / 2, y + size + 4)
    elif not ready:
        fill(148, 163, 184)
        text("CD", x + size / 2, y + size + 4)
    else:
        fill(74, 222, 128)
        text("READY", x + size / 2, y + size + 4)

def drawSkillBar():
    """Draws the League-of-Legends-style Q/W/E/R skill bar at the bottom of the screen"""
    hint(DISABLE_DEPTH_TEST)
    camera()

    icon_size = 62
    gap = 14
    total_width = icon_size * 4 + gap * 3
    start_x = width / 2 - total_width / 2
    y = height - 100

    # Q - Alpha Strike
    drawSkillIcon(start_x, y, icon_size, "Q", [255, 215, 0],
                  alpha_active, (alpha_duration - alpha_timer) / 60.0,
                  q_cooldown_timer, q_cooldown_max)

    # W - Meditate
    drawSkillIcon(start_x + (icon_size + gap), y, icon_size, "W", [34, 197, 94],
                  meditate_active, 0,
                  w_cooldown_timer, w_cooldown_max)

    # E - Wuju Style
    drawSkillIcon(start_x + (icon_size + gap) * 2, y, icon_size, "E", [56, 189, 248],
                  wuju_active, wuju_timer / 60.0,
                  e_cooldown_timer, e_cooldown_max)

    # R - Highlander
    drawSkillIcon(start_x + (icon_size + gap) * 3, y, icon_size, "R", [248, 113, 113],
                  highlander_active, highlander_timer / 60.0,
                  r_cooldown_timer, r_cooldown_max)

    textAlign(LEFT, BASELINE) # Reset alignment for any other text calls
    hint(ENABLE_DEPTH_TEST)

def mouseDragged():
    global cam_rot_x, cam_rot_y
    cam_rot_y += (mouseX - pmouseX) * 0.01
    cam_rot_x += (mouseY - pmouseY) * 0.01
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
                meditate_active = False
            slash_active = True
            slash_timer = 0
            current_anim = "slash"

def keyPressed():
    global current_anim, cam_rot_x, cam_rot_y, cam_zoom
    global key_up, key_down, key_left, key_right
    global slash_active, slash_timer, meditate_active, alpha_active, alpha_timer
    global wuju_active, wuju_timer, wuju_duration, highlander_active, highlander_timer, highlander_duration
    global q_cooldown_timer, w_cooldown_timer, e_cooldown_timer, r_cooldown_timer

    # Skill Bind Q - Alpha Strike
    if key == 'q' or key == 'Q':
        if not alpha_active and not slash_active and q_cooldown_timer <= 0:
            alpha_active = True
            alpha_timer = 0
            meditate_active = False
            current_anim = "slash"
            q_cooldown_timer = q_cooldown_max

    # Skill Bind W - Meditate (toggle; cooldown starts when turned OFF)
    elif key == 'w' or key == 'W':
        if not alpha_active and not slash_active:
            if not meditate_active and w_cooldown_timer <= 0:
                meditate_active = True
                current_anim = "meditate"
            elif meditate_active:
                meditate_active = False
                current_anim = "idle"
                w_cooldown_timer = w_cooldown_max

    # Skill Bind E - Wuju Style
    elif key == 'e' or key == 'E':
        if not alpha_active and e_cooldown_timer <= 0:
            wuju_active = True
            wuju_timer = wuju_duration
            e_cooldown_timer = e_cooldown_max

    # Skill Bind R - Highlander (Ultimate)
    elif key == 'r' or key == 'R':
        if not alpha_active and r_cooldown_timer <= 0:
            highlander_active = True
            highlander_timer = highlander_duration
            r_cooldown_timer = r_cooldown_max

    # Alternative slash trigger
    elif key == ' ':
        if not slash_active and not alpha_active:
            if meditate_active:
                meditate_active = False
            slash_active = True
            slash_timer = 0
            current_anim = "slash"

    # Movement binds - ARROW KEYS ONLY
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
