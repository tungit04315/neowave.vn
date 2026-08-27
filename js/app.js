tailwind.config = {
    darkMode: "class",
    theme: {
        extend: {
            colors: {
                "primary": "#6812ca",
                "primary-light": "#8b3fe0",
                "primary-dark": "#4a0b94",
                "background-light": "#fbfafd",
                "background-dark": "#181022",
                "accent-blue": "#4FACFE",
                "accent-cyan": "#00F2FE",
            },
            fontFamily: {
                "display": ["Space Grotesk", "sans-serif"],
                "body": ["Noto Sans", "sans-serif"],
            },
            borderRadius: { "DEFAULT": "0.5rem", "lg": "1rem", "xl": "1.5rem", "2xl": "2rem", "full": "9999px" },
            backgroundImage: {
                'hero-gradient': 'linear-gradient(135deg, #fbfafd 0%, #f4effc 100%)',
                'text-gradient': 'linear-gradient(90deg, #6812ca 0%, #4FACFE 100%)',
                'glass': 'linear-gradient(180deg, rgba(255, 255, 255, 0.7) 0%, rgba(255, 255, 255, 0.3) 100%)',
            }
        },
    },
}