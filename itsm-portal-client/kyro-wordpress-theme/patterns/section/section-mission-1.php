<?php
/**
 * Title: Mission section (style 1)
 * Slug: mroya/section-mission-1
 * Categories: mroya_sections_mission
 * Description: Displays mission heading and text.
 * Keywords: section, mission
 * Post Types: page, wp_template
 * Viewport width: 1440
 *
 * @package Mroya
 * @since Mroya 1.0.0
 */

?>
<!-- wp:group {"tagName":"section","metadata":{"name":"<?php echo esc_html_x( 'Mission (style 1)', 'Name for the Mission section pattern', 'mroya' ); ?>"},"align":"full","className":"section section--mission-1","style":{"spacing":{"padding":{"top":"var:preset|spacing|20","bottom":"var:preset|spacing|60"},"margin":{"top":"0"},"blockGap":"var:preset|spacing|50"}},"layout":{"type":"constrained"}} -->
<section class="wp-block-group alignfull section section--mission-1" id="section-mission-1" style="margin-top:0;padding-top:var(--wp--preset--spacing--20);padding-bottom:var(--wp--preset--spacing--60)">
	<!-- wp:group {"tagName":"header","metadata":{"name":"<?php echo esc_html_x( 'Header', 'Name for the section header area', 'mroya' ); ?>"},"align":"wide","className":"section__header","layout":{"type":"default"}} -->
	<header class="wp-block-group alignwide section__header">
		<!-- wp:heading {"className":"has-span-indent","fontSize":"huge"} -->
		<h2 class="wp-block-heading has-span-indent has-huge-font-size"><span class="indent"><?php echo esc_html_x( '[ Our mission ]', 'Mission section title','mroya' ); ?></span><span class="text"><?php echo esc_html_x( 'We help organizations deliver faster, smarter IT support through automation, AI, and modern service management.', 'Mission section title', 'mroya' ); ?></span></h2>
		<!-- /wp:heading -->
	</header>
	<!-- /wp:group -->

	<!-- wp:group {"metadata":{"name":"<?php echo esc_html_x( 'Content', 'Name for the section content area', 'mroya' ); ?>"},"align":"wide","className":"section__content","layout":{"type":"grid","columnCount":4,"minimumColumnWidth":null}} -->
	<div class="wp-block-group alignwide section__content">
		<!-- wp:list {"className":"is-style-list-mono list--first"} -->
		<ul class="wp-block-list is-style-list-mono list--first">
			<!-- wp:list-item -->
				<li><?php echo esc_html_x( 'Incident Management', 'Mission section text', 'mroya' ); ?></li>
			<!-- /wp:list-item -->

			<!-- wp:list-item -->
				<li><?php echo esc_html_x( 'Service Requests', 'Mission section text', 'mroya' ); ?></li>
			<!-- /wp:list-item -->

			<!-- wp:list-item -->
				<li><?php echo esc_html_x( 'Workflow Automation', 'Mission section text', 'mroya' ); ?></li>
			<!-- /wp:list-item -->

			<!-- wp:list-item -->
				<li><?php echo esc_html_x( 'AI Assistance', 'Mission section text', 'mroya' ); ?></li>
			<!-- /wp:list-item -->

			<!-- wp:list-item -->
				<li><?php echo esc_html_x( 'Knowledge Management', 'Mission section text', 'mroya' ); ?></li>
			<!-- /wp:list-item -->

			<!-- wp:list-item -->
				<li><?php echo esc_html_x( 'Operational Visibility', 'Mission section text', 'mroya' ); ?></li>
			<!-- /wp:list-item -->
		</ul>
		<!-- /wp:list -->

		<!-- wp:list {"className":"is-style-list-mono list--second"} -->
		<ul class="wp-block-list is-style-list-mono list--second">
			<!-- wp:list-item -->
				<li><?php echo esc_html_x( 'Centralized Workspaces', 'Mission section text', 'mroya' ); ?></li>
			<!-- /wp:list-item -->

			<!-- wp:list-item -->
				<li><?php echo esc_html_x( 'Team Collaboration', 'Mission section text', 'mroya' ); ?></li>
			<!-- /wp:list-item -->

			<!-- wp:list-item -->
				<li><?php echo esc_html_x( 'Faster Resolution', 'Mission section text', 'mroya' ); ?></li>
			<!-- /wp:list-item -->

			<!-- wp:list-item -->
				<li><?php echo esc_html_x( 'Modern Workflows', 'Mission section text', 'mroya' ); ?></li>
			<!-- /wp:list-item -->

			<!-- wp:list-item -->
				<li><?php echo esc_html_x( 'Self-Service Support', 'Mission section text', 'mroya' ); ?></li>
			<!-- /wp:list-item -->

			<!-- wp:list-item -->
				<li><?php echo esc_html_x( 'Enterprise Service Management', 'Mission section text', 'mroya' ); ?></li>
			<!-- /wp:list-item -->
		</ul>
		<!-- /wp:list -->
	</div>
	<!-- /wp:group -->
</section>
<!-- /wp:group -->
