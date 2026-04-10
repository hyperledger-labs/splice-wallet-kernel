import sys
from pathlib import Path

# Add extensions directory to path
sys.path.insert(0, str(Path(__file__).parent / '_extensions'))

project = "Wallet Integration Guide"

extensions = [
    'sphinx_copybutton',
    'sphinx_tabs.tabs',
    'sphinx.ext.todo',
    'sphinx_design',
    'before_after'
]

# Add custom CSS
html_static_path = ['_static']
html_css_files = ['custom.css']
