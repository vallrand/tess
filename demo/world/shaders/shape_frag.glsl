#version 300 es
precision highp float;
in vec2 vUV;
out vec4 fragColor;

uniform vec4 uColor;
uniform float uBlur;
#ifdef TRIANGLE
uniform vec2 uSize;
#endif
#ifdef ROUNDED_BOX
uniform float uSize;
uniform float uRadius;
#endif

#define TAU 6.283185307179586
float triangle(in vec2 p, in vec2 p0, in vec2 p1, in vec2 p2){
	vec2 e0 = p1 - p0; vec2 e1 = p2 - p1; vec2 e2 = p0 - p2;
	vec2 v0 = p - p0; vec2 v1 = p - p1; vec2 v2 = p - p2;

	vec2 pq0 = v0 - e0*clamp( dot(v0,e0)/dot(e0,e0), 0.0, 1.0 );
	vec2 pq1 = v1 - e1*clamp( dot(v1,e1)/dot(e1,e1), 0.0, 1.0 );
	vec2 pq2 = v2 - e2*clamp( dot(v2,e2)/dot(e2,e2), 0.0, 1.0 );
    
    float s = e0.x*e2.y - e0.y*e2.x;
    vec2 d = min( min( vec2( dot( pq0, pq0 ), s*(v0.x*e0.y-v0.y*e0.x) ),
                       vec2( dot( pq1, pq1 ), s*(v1.x*e1.y-v1.y*e1.x) )),
                       vec2( dot( pq2, pq2 ), s*(v2.x*e2.y-v2.y*e2.x) ));
	return -sqrt(d.x)*sign(d.y);
}

void main(){
    vec2 uv = 2.*vUV-1.;
#if defined(CIRCLE)
    float distance = max(0.0, 1.0-length(uv));
    float alpha = distance*distance;
#elif defined(GLOW)
    float alpha = 0.5*(1.0/length(uv)-1.0);
#elif defined(WAVE)
    uv = vec2(atan(uv.y,uv.x)/TAU,length(uv));
    float alpha = .5-.5*cos(smoothstep(0.2,1.0,uv.y)*TAU);
    alpha = alpha * alpha;
#elif defined(RING)
    uv = vec2(atan(uv.y,uv.x)/TAU,length(uv));
    float distance = max(0.0, 1.0-uv.y);
    //distance -= smoothstep(1.0,0.0,uv.y) * smoothstep(0.0,1.0,abs(fract(uv.x * 9.0)-0.5));
    float alpha = smoothstep(0.0,0.1,distance) * smoothstep(0.5,0.0,distance);
    alpha = pow(alpha, 1.4);
#elif defined(ROUNDED_BOX)
    float distance = length(max(abs(uv)-uSize+uRadius,0.0))-uRadius;
    float alpha = 1.0-smoothstep(0.0, 1.0 - uSize, distance);
#elif defined(TRIANGLE)
    float distance = triangle(uv, vec2(-uSize.x,uSize.y), vec2(-uSize.x,-uSize.y), vec2(uSize.x,0.0));
    float alpha = smoothstep(uBlur, 0.0, distance);
#elif defined(SPARKLE)
    uv = abs(uv);
    uv += mix(0.0,-0.2*(1.0-max(uv.x,uv.y)),max(uv.x,uv.y));
    float sparkle = max(0.0, 1.0 - (8.0*uv.x*uv.y + 0.8*(uv.x+uv.y)));
    sparkle = pow(1.0/(1.0-sparkle),0.2) - 1.0;
    float alpha = sparkle * 2.0;
#elif defined(BLINK)
    uv = abs(uv);
    float x0 = 1.0-uv.x*uv.x;
    float x1 = 1.0-uv.x;
    float y0 = mix(pow(1.0-uv.y,8.0), pow(1.0-uv.y,2.0), x1*x1);
    float alpha = smoothstep(0.0, 1.0, x0*y0);
#elif defined(STRIPE)
    uv = .5+.5*uv;
    float line = .5+.5*cos(TAU*(4.0*uv.y+0.5));
    float l0 = 1.0/pow(1.0-line,0.2);
    float alpha = 0.4 * line * l0;
#endif
    fragColor = uColor * alpha;
}