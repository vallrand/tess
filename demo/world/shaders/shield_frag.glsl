#version 300 es
precision highp float;
precision highp int;

in vec3 vPosition;
in vec3 vNormal; 
in vec2 vUV;

layout(location=0) out vec4 fragColor;

uniform GlobalUniforms {
    vec4 uTime;
};
uniform CameraUniforms {
    mat4 uViewProjectionMatrix;
    mat4 uViewMatrix;
    vec3 uEyePosition;
};
uniform ModelUniforms {
    mat4 uModelMatrix;
    vec4 uColor;
    float uLayer;
    float uStartTime;
};
uniform sampler2D uPositionBuffer;
#ifdef DISPLACEMENT
uniform sampler2D uAlbedoBuffer;
#endif

#define TAU 6.283185307179586

vec3 hash(vec3 p){
	p = vec3( dot(p,vec3(127.1,311.7, 74.7)),
			  dot(p,vec3(269.5,183.3,246.1)),
			  dot(p,vec3(113.5,271.9,124.6)));
	return -1.0 + 2.0*fract(sin(p)*43758.5453123);
}

float noise3D(in vec3 p){
    vec3 i = floor( p );
    vec3 f = fract( p );
	vec3 u = f*f*(3.0-2.0*f);
    return mix( mix( mix( dot( hash( i + vec3(0.0,0.0,0.0) ), f - vec3(0.0,0.0,0.0) ), 
                          dot( hash( i + vec3(1.0,0.0,0.0) ), f - vec3(1.0,0.0,0.0) ), u.x),
                     mix( dot( hash( i + vec3(0.0,1.0,0.0) ), f - vec3(0.0,1.0,0.0) ), 
                          dot( hash( i + vec3(1.0,1.0,0.0) ), f - vec3(1.0,1.0,0.0) ), u.x), u.y),
                mix( mix( dot( hash( i + vec3(0.0,0.0,1.0) ), f - vec3(0.0,0.0,1.0) ), 
                          dot( hash( i + vec3(1.0,0.0,1.0) ), f - vec3(1.0,0.0,1.0) ), u.x),
                     mix( dot( hash( i + vec3(0.0,1.0,1.0) ), f - vec3(0.0,1.0,1.0) ), 
                          dot( hash( i + vec3(1.0,1.0,1.0) ), f - vec3(1.0,1.0,1.0) ), u.x), u.y), u.z );
}
float fbm(in vec3 p, in int layers){
    float f = 0.0, scale = 1.0;
    for(int i=0;i<layers;i++){
        f += scale * abs(noise3D(p));
        scale *= 0.5;
        p *= 1.8;
    }
    return f;
}

void main(){
    vec3 position = vPosition;
    vec3 normal = normalize(vNormal);
    vec3 view = normalize(uEyePosition - position);
    float NdV = dot(normal, view);

    float n = fbm(position + vec3(0,2.*uTime.x,0), 4);

#ifdef DISPLACEMENT
    vec3 viewNormal = (uViewMatrix * vec4(normal, 0.0)).xyz;
    float fresnel = smoothstep(0.4,1.0,NdV*NdV);
    vec2 distortion = fresnel * 0.1 * viewNormal.rg;
    distortion *= 20.0 * uColor.a * n;

    vec2 uv = vec2(gl_FragCoord.xy) / vec2(textureSize(uAlbedoBuffer, 0));
    uv += distortion;
    fragColor = texture(uAlbedoBuffer, uv);
    fragColor.rgb *= mix(vec3(1),uColor.rgb,fresnel);
#else
    ivec2 fragCoord = ivec2(gl_FragCoord.xy);
    vec4 fragPosition = texelFetch(uPositionBuffer, fragCoord, 0);
    float distance = length(fragPosition.xyz - position);

    float edge = smoothstep(1.0,0.0,NdV)*smoothstep(-0.5,0.0,NdV);
    edge += smoothstep(0.5,0.0,distance);

    vec3 color = vec3(0.0,0.1,0.1);
    color = mix(color, vec3(0.4,0.6,0.6), smoothstep(0.5,0.0,n));
    color = mix(color, vec3(0.6,0.8,0.8), smoothstep(0.2,0.0,n));
    float wave = smoothstep(0.6,1.0,sin(TAU * (0.2*position.y + 0.5*n) + 2.*uTime.x));
    color *= mix(edge,1.0,wave);

    fragColor = uColor * vec4(color,0.1*edge);
#endif
}