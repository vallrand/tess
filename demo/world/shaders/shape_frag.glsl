#version 300 es
precision highp float;
in vec2 vUV;
out vec4 fragColor;

uniform vec4 uColor;
uniform float uBlur;
#ifdef TRIANGLE
uniform vec2 uSize;
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
#if defined(CRESCENT)
    float alpha = smoothstep(1.0,0.85,length(uv));
    alpha -= smoothstep(1.0,0.75,length(uv+vec2(0,0.2)));
    alpha *= (.5+.5*uv.y) * pow(length(uv),4.0) * 2.0;
#elif defined(RETICLE)
    const float edge = 0.02;
    vec2 polar = vec2(.5+atan(uv.y,uv.x)/TAU,length(uv));
    polar.y *= max(abs(uv.x),abs(uv.y)) * 1.2;
    float outer = smoothstep(.9,.9-edge,polar.y)*smoothstep(.7-edge,.7,polar.y);
    outer *= smoothstep(.7,.7-edge,abs(fract(polar.x*4.)*2.-1.));
    float plus = smoothstep(.04+edge,.04,min(abs(uv.x),abs(uv.y)));
    plus = max(0., plus - smoothstep(.04,.04-edge,polar.y));
    float inner = smoothstep(.3,.3-edge,polar.y)*smoothstep(.2-edge,.2,polar.y);
    inner = max(0., inner - smoothstep(.1+edge,.1,min(abs(uv.x),abs(uv.y))));
    float alpha = plus + outer + inner;
#elif defined(TRIANGLE)
    //TODO NOT USED
    float distance = triangle(uv, vec2(-uSize.x,uSize.y), vec2(-uSize.x,-uSize.y), vec2(uSize.x,0.0));
    float alpha = smoothstep(uBlur, 0.0, distance);
#elif defined(STRIPE)
    uv = .5+.5*uv;
    float line = .5+.5*cos(TAU*(4.0*uv.y+0.5));
    float l0 = 1.0/pow(1.0-line,0.2);
    float alpha = 0.4 * line * l0;
#endif
    fragColor = uColor * alpha;
}