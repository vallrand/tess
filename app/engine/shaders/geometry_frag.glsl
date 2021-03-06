#pragma import(./template/model_frag.glsl)

#define MAP_SCALE 10.0

uniform sampler2D uDiffuseMap;
uniform sampler2D uNormalMap;

#ifdef COLOR_INDEX
    uniform sampler2DArray uArrayMap;
    uniform float uArrayMapLayers;
#endif

vec2 hash22(in vec2 uv){
    uvec2 q = floatBitsToUint(uv);
	q *= uvec2(1597334673U, 3812015801U);
	q = (q.x ^ q.y) * uvec2(1597334673U, 3812015801U);
	return vec2(q) * (1.0 / float(0xffffffffU));
}
float simplex2D(in vec2 uv){
    const float K1 = (sqrt(3.)-1.)/2.;
    const float K2 = (3.-sqrt(3.))/6.;

	vec2 i = floor(uv + (uv.x+uv.y)*K1);
    vec2 a = uv - i + (i.x+i.y)*K2;
    float m = step(a.y,a.x); 
    vec2 o = vec2(m,1.0-m);
    vec2 b = a - o + K2;
	vec2 c = a - 1.0 + 2.0*K2;
    vec3 h = max(0.5-vec3(dot(a,a), dot(b,b), dot(c,c)), 0.0);
    vec2 rx = 1.-2.*hash22(i+0.0);
    vec2 ry = 1.-2.*hash22(i+o);
    vec2 rz = 1.-2.*hash22(i+1.0);
	vec3 n = h*h*h*h*vec3(dot(a,rx), dot(b,ry), dot(c,rz));
    return 0.5 + 0.5*dot(n, vec3(70.0));
}
#ifdef DISSOLVE
    uniform vec3 uDissolveDirection;
    uniform float uDissolveThreshold;
    uniform vec4 uDissolveColor;
    uniform vec3 uDissolveUVScale;
#endif

vec2 parallaxMapping(in vec2 uv, in vec3 viewDirection, in float heightScale){
#ifndef PARALLAX_LAYERS
    float depth = texture(uNormalMap, uv).w;
    return uv - viewDirection.xy * heightScale * depth / viewDirection.z;
#else
    float numLayers = float(PARALLAX_LAYERS) - float(PARALLAX_LAYERS-1) * abs(dot(vec3(0,0,1), viewDirection));
    float layerDepth = 1.0 / numLayers;
    vec2 deltaUV = heightScale * viewDirection.xy / (viewDirection.z * numLayers);
    float depth = 0.0, value = texture(uNormalMap, uv).w;
    for(int i=0;i<PARALLAX_LAYERS;i++){
        if(value < depth) break;
        uv -= deltaUV;
        value = texture(uNormalMap, uv).w;
        depth += layerDepth;
    }
    vec2 prevUV = uv + deltaUV;
    float depthAfter = value - depth;
    float depthBefore = texture(uNormalMap, prevUV).w - depth + layerDepth;
    float weight = depthAfter / (depthAfter - depthBefore);
    return mix(uv, prevUV, weight);
#endif
}

void main(){
    vec2 uv = vUV;
    vec3 position = vPosition;
//#ifdef SKINNING
//    vec3 normal = normalize(cross(dFdx(position),dFdy(position)));
//#else
    vec3 normal = normalize(vNormal);
//#endif

#ifdef NORMAL_MAPPING
    vec3 dpdx = dFdx(position);
    vec3 dpdy = dFdy(position);
    vec2 duvdx = dFdx(uv);
    vec2 duvdy = dFdy(uv);
    vec3 r1 = cross(dpdy, normal);
    vec3 r2 = cross(normal, dpdx);
#ifdef BUMP_MAPPING
    vec3 tangent = r1 * duvdx.x + r2 * duvdy.x;
    vec3 binormal = r1 * duvdx.y + r2 * duvdy.y;
    float invMax = inversesqrt(max(dot(tangent, tangent), dot(binormal, binormal)));
    mat3 TBN = mat3(tangent * invMax, binormal * invMax, normal);

    mat3 invTBN = mat3(vec3(TBN[0].x,TBN[1].x,TBN[2].x),vec3(TBN[0].y,TBN[1].y,TBN[2].y),vec3(TBN[0].z,TBN[1].z,TBN[2].z));
    vec3 viewDirection = invTBN * normalize(position - uEyePosition);
    uv = parallaxMapping(uv, viewDirection, 0.1);

    vec3 mappedNormal = texture(uNormalMap, uv).xyz*2.-1.;
    normal = normalize(TBN * mappedNormal);
#else
    vec3 mappedNormal = texture(uNormalMap, uv).xyz*2.-1.;
    vec2 heightGradient = MAP_SCALE * 2.0 * mappedNormal.xy / -mappedNormal.z;
    
    float dhdx = dot(heightGradient, duvdx);
    float dhdy = dot(heightGradient, duvdy);

    vec3 surfaceGradient = (r1 * dhdx + r2 * dhdy) / dot(dpdx, r1);
    normal = normalize(normal - surfaceGradient);
#endif
#endif
    vec4 diffuse = texture(uDiffuseMap, uv);

#ifdef COLOR_INDEX
#ifdef VERTEX_COLOR
    diffuse = texture(uArrayMap, vec3(4.*uv, uArrayMapLayers * vColor.a));
    diffuse.rgb *= vColor.rgb;
#else
    vec2 size = vec2(textureSize(uDiffuseMap, 0));
    float colorIndex = texelFetch(uDiffuseMap, ivec2(uv * size), 0).r;
    float ao = diffuse.g;
    diffuse = texture(uArrayMap, vec3(4.*uv, uArrayMapLayers * colorIndex));
    diffuse.rgb *= ao;
#endif
#endif

#ifdef DISSOLVE
    diffuse = mix(uColor.rrrg, diffuse, uColor.b);
    float threshold = dot(position, uDissolveDirection) + uDissolveUVScale.z * simplex2D(uv * uDissolveUVScale.xy);
    if(threshold < uColor.a) discard;
    diffuse = mix(diffuse, uDissolveColor, smoothstep(-uDissolveThreshold,0.,uColor.a - threshold));
#else
    diffuse.rgb *= uColor.rgb;
    diffuse.a = mix(0.5, diffuse.a, uColor.a);
#endif
    float metallic = 2.0 * 0.5 * smoothstep(0.25, 0.0, diffuse.a);

    fragPosition = vec4(position - uEyePosition, uLayer);
    fragNormal = vec4(normal, metallic);
    fragAlbedo = diffuse;
}