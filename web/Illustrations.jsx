export function HeroArt() {
  return (
    <svg
      className="hero-art"
      viewBox="0 0 450 330"
      fill="none"
      aria-hidden="true"
    >
      <defs>
        <pattern id="grid" width="24" height="24" patternUnits="userSpaceOnUse">
          <path d="M24 0H0V24" stroke="#b7cdb5" strokeOpacity=".25" />
        </pattern>
      </defs>
      <rect x="110" y="34" width="255" height="260" rx="125" fill="#d2dfc6" />
      <rect
        x="110"
        y="34"
        width="255"
        height="260"
        rx="125"
        fill="url(#grid)"
      />
      <circle cx="287" cy="99" r="35" fill="#f3ce6c" />
      <path
        d="M135 235C175 169 190 182 215 215C244 150 283 139 341 226V294H135Z"
        fill="#a5be96"
      />
      <path
        d="M110 259C147 226 185 233 229 257C271 209 323 207 365 257V281C365 288 358 294 350 294H125C116 294 110 288 110 279Z"
        fill="#7e9e74"
      />
      <path
        d="M235 284C240 243 224 199 202 161M237 261C250 212 281 193 299 172"
        stroke="#3f6b4d"
        strokeWidth="5"
        strokeLinecap="round"
      />
      <path
        d="M217 196C164 200 147 174 157 140C195 139 217 157 217 196Z"
        fill="#447657"
      />
      <path
        d="M223 225C173 238 150 220 146 190C178 181 212 191 223 225Z"
        fill="#639168"
      />
      <path
        d="M249 226C242 183 263 152 303 154C310 191 286 219 249 226Z"
        fill="#335e45"
      />
      <path
        d="M237 260C266 226 304 226 324 253C301 280 270 277 237 260Z"
        fill="#527c53"
      />
      <path d="M206 281H266L258 322H216Z" fill="#f2e5ca" />
      <path d="M211 294H262M214 305H260" stroke="#dbc6a5" strokeWidth="2" />
      <g transform="translate(34 205) rotate(-10)">
        <rect width="116" height="85" rx="7" fill="#fffbef" />
        <path
          d="M15 21H90M15 32H99M15 43H79"
          stroke="#ced6bc"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <path d="M50 67C37 59 45 48 52 56C61 45 70 56 50 67Z" fill="#e4ad8d" />
      </g>
      <path
        d="M80 88L84 78L88 88L98 92L88 96L84 106L80 96L70 92Z"
        fill="#b8ca98"
      />
      <path
        d="M382 191L385 183L388 191L396 194L388 197L385 205L382 197L374 194Z"
        fill="#f0c269"
      />
      <path
        d="M310 59C321 54 324 57 325 62C329 54 337 56 339 62"
        stroke="#71886a"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <circle cx="72" cy="165" r="4" fill="#d3af63" />
      <circle cx="377" cy="111" r="3" fill="#8bab82" />
    </svg>
  );
}

export function MoodFace({ score = 3, size = 48, selected = false }) {
  const colors = ["#d8ddeb", "#dce8e4", "#f2e5af", "#f5d5a2", "#f2c1aa"];
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 56 56"
      fill="none"
      aria-hidden="true"
      className={selected ? "face-selected" : ""}
    >
      <circle cx="28" cy="28" r="26" fill={colors[score - 1]} />
      {score < 3 ? (
        <>
          <path
            d="M16 23L22 21M34 21L40 23"
            stroke="#55605b"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <circle cx="20" cy="27" r="1.6" fill="#55605b" />
          <circle cx="36" cy="27" r="1.6" fill="#55605b" />
        </>
      ) : score === 5 ? (
        <>
          <path
            d="M16 25Q20 18 24 25M32 25Q36 18 40 25"
            stroke="#70533f"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </>
      ) : (
        <>
          <circle cx="20" cy="25" r="1.7" fill="#705b43" />
          <circle cx="36" cy="25" r="1.7" fill="#705b43" />
        </>
      )}
      <path
        d={
          score === 1
            ? "M21 38Q28 30 35 38"
            : score === 2
              ? "M23 36Q28 33 33 36"
              : score === 3
                ? "M23 34Q28 37 33 34"
                : "M20 33Q28 44 36 33"
        }
        stroke="#665b48"
        strokeWidth="2"
        strokeLinecap="round"
        fill={score === 5 ? "#665b48" : "none"}
      />
      {score > 3 && (
        <>
          <ellipse cx="14" cy="32" rx="4" ry="2" fill="#dc977e" opacity=".45" />
          <ellipse cx="42" cy="32" rx="4" ry="2" fill="#dc977e" opacity=".45" />
        </>
      )}
    </svg>
  );
}

export function TreeArt() {
  return (
    <svg viewBox="0 0 240 170" fill="none" aria-hidden="true">
      <circle cx="123" cy="83" r="67" fill="#e0e8d1" />
      <path
        d="M111 159V82Q108 56 96 39"
        stroke="#71906a"
        strokeWidth="10"
        strokeLinecap="round"
      />
      <path
        d="M112 111Q149 80 164 56"
        stroke="#71906a"
        strokeWidth="8"
        strokeLinecap="round"
      />
      <ellipse
        cx="90"
        cy="49"
        rx="30"
        ry="39"
        transform="rotate(-36 90 49)"
        fill="#91ad7e"
      />
      <ellipse
        cx="161"
        cy="54"
        rx="29"
        ry="39"
        transform="rotate(38 161 54)"
        fill="#b3c79b"
      />
      <path d="M83 152H150L142 170H92Z" fill="#d9bc91" />
      <rect
        x="145"
        y="98"
        width="66"
        height="46"
        rx="5"
        fill="#fff9e9"
        transform="rotate(10 145 98)"
      />
      <path d="M159 114L175 128L195 118" stroke="#c7b991" strokeWidth="2" />
      <path
        d="M35 97L40 87L45 97L55 102L45 107L40 117L35 107L25 102Z"
        fill="#efcc79"
      />
    </svg>
  );
}
