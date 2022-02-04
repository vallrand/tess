vec4 voronoi(in vec2 uv, in vec2 period, in float jitter, in float width, in float seed){
    uv *= period;
    vec2 i = floor(uv); vec2 f = uv - i;
    vec2 minPos, tilePos;
    float md = 1e+5;
    for(int y=-1;y<=1;y++)
    for(int x=-1;x<=1;x++){
        vec2 n = vec2(x,y);
        vec2 cPos = jitter * hash22(mod(i + n, period) + seed);
        vec2 rPos = n + cPos - f;
        float d = dot(rPos, rPos);
        if(d >= md) continue;
        md = d;
        minPos = rPos;
        tilePos = cPos;
    }
    float md0 = 1e+5, md1 = 1e+5;
    for(int y=-2;y<=2;y++)
    for(int x=-2;x<=2;x++){
        vec2 n = vec2(x,y);
        vec2 cPos = jitter * hash22(mod(i + n, period) + seed);
        vec2 rPos = n + cPos - f;
        vec2 v = minPos - rPos;
        if(dot(v, v) <= 1e-5) continue;
        float d = dot(0.5 * (minPos + rPos), normalize(rPos - minPos));
        if(d < md0){
            md1 = md0; md0 = d;
        }else if(d < md1){
            md1 = d;
        }
    }
    md0 += (md1 - md0) * width;
    return vec4(md0, md, tilePos);
}