from docutils import nodes
from docutils.parsers.rst import Directive
from docutils.statemachine import StringList

class BeforeAfterDirective(Directive):
    has_content = True
    required_arguments = 0
    optional_arguments = 0
    option_spec = {}

    def run(self):
        # Find the separator line
        separator_index = None
        for i, line in enumerate(self.content):
            if line.strip() == '---':
                separator_index = i
                break

        if separator_index is None:
            error = self.state_machine.reporter.error(
                'before-after directive requires a "---" separator line',
                nodes.literal_block('', ''),
                line=self.lineno
            )
            return [error]

        # Split content into before and after
        before_content = self.content[:separator_index]
        after_content = self.content[separator_index + 1:]

        # Create main container
        container = nodes.container(classes=['before-after'])

        # Before section
        before_container = nodes.container(classes=['before'])
        before_title = nodes.paragraph(text='Instead of (v0):')
        before_title['classes'].append('before-after-title')
        before_container += before_title

        # Parse the before content (supports nested directives like code-block)
        before_node = nodes.container()
        self.state.nested_parse(before_content, self.content_offset, before_node)
        before_container += before_node

        # After section
        after_container = nodes.container(classes=['after'])
        after_title = nodes.paragraph(text='You now write (v1):')
        after_title['classes'].append('before-after-title')
        after_container += after_title

        # Parse the after content (supports nested directives like code-block)
        after_node = nodes.container()
        self.state.nested_parse(after_content, self.content_offset + separator_index + 1, after_node)
        after_container += after_node

        container += before_container
        container += after_container

        return [container]

def setup(app):
    app.add_directive('before-after', BeforeAfterDirective)
    return {'version': '0.1'}
