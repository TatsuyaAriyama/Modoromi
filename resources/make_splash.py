from PIL import Image, ImageDraw
import math

S = 2732
img = Image.new("RGB", (S, S), (26, 20, 48))  # #1a1430

# vertical twilight gradient + soft central radial glow
px = img.load()
top = (22, 17, 42)      # deep
bot = (44, 33, 72)      # slightly warmer twilight
cx, cy = S/2, S*0.46
for y in range(S):
    t = y / (S - 1)
    r = int(top[0] + (bot[0]-top[0])*t)
    g = int(top[1] + (bot[1]-top[1])*t)
    b = int(top[2] + (bot[2]-top[2])*t)
    for x in range(0, S, 1):
        # radial glow
        d = math.hypot(x-cx, y-cy) / (S*0.55)
        glow = max(0.0, 1.0 - d)
        gr = min(255, int(r + glow*38))
        gg = min(255, int(g + glow*30))
        gb = min(255, int(b + glow*52))
        px[x, y] = (gr, gg, gb)

draw = ImageDraw.Draw(img)

# Eyemark in 1024 viewBox space -> map to canvas.
# bbox center of mark ~ (512, 613); place at (S/2, S*0.5)
scale = 1.45
ox = S/2 - 512*scale
oy = S*0.5 - 613*scale
def T(x, y):
    return (ox + x*scale, oy + y*scale)

white = (247, 244, 251)
lw = int(46 * scale)  # stroke width

def thick_line(p0, p1, w, col):
    draw.line([p0, p1], fill=col, width=w)
    r = w/2
    for p in (p0, p1):
        draw.ellipse([p[0]-r, p[1]-r, p[0]+r, p[1]+r], fill=col)

# eye curve (quadratic bezier) as polyline
P0, C, P1 = (210,470), (512,700), (814,470)
pts = []
N = 60
for i in range(N+1):
    t = i/N
    x = (1-t)**2*P0[0] + 2*(1-t)*t*C[0] + t*t*P1[0]
    y = (1-t)**2*P0[1] + 2*(1-t)*t*C[1] + t*t*P1[1]
    pts.append(T(x,y))
for i in range(len(pts)-1):
    thick_line(pts[i], pts[i+1], lw, white)

# eyelashes
lashes = [((196,500),(140,590)), ((338,600),(306,708)), ((512,640),(512,756)),
          ((686,600),(718,708)), ((828,500),(884,590))]
for a,b in lashes:
    thick_line(T(*a), T(*b), lw, white)

img.save("/tmp/splash_full.png")
print("done", img.size)
